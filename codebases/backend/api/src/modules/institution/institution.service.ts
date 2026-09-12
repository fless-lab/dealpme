import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { normalizeRccm, RegistryError, type RegistryPort, type RegistryLookupResult } from "@dealpme/connector-registry";
import { createHash } from "node:crypto";
import { DealPmeError, ErrorCode, type CertificationDecisionRequest } from "@dealpme/contracts";
import { newId } from "@dealpme/domain";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { certifications, companies, deals, membershipConfirmations, organisations, registryRecords, registryConsultations, users } from "../../database/schema/core.js";
import { withTenant } from "../../database/tenant.js";
import { AuditService } from "../../platform/audit.service.js";
import type { Principal } from "../../platform/auth.js";
import { CertificationRequestService } from "./certification-request.service.js";
import { REGISTRY_PORT } from "./registry.provider.js";
import { registryOutcome, type ManualRegistryResult } from "./registry-review.js";

export interface CertificationStatus {
  isDealReady: boolean;
  decision: (typeof certifications.$inferSelect)["decision"] | null;
  scopeStatement: string | null;
  decidedAt: Date | null;
  expiresAt: Date | null;
  officerUserId: string | null;
}

function statusOf(row: typeof certifications.$inferSelect | undefined): CertificationStatus {
  if (!row) return { isDealReady: false, decision: null, scopeStatement: null, decidedAt: null, expiresAt: null, officerUserId: null };
  const expired = row.expiresAt ? row.expiresAt.getTime() < Date.now() : false;
  return { isDealReady: row.decision === "GRANTED" && !expired && !row.registryInvalidatedAt, decision: row.decision, scopeStatement: row.scopeStatement, decidedAt: row.decidedAt, expiresAt: row.expiresAt, officerUserId: row.officerUserId };
}

@Injectable()
export class InstitutionService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    @Inject(REGISTRY_PORT) private readonly registry: RegistryPort,
    private readonly audit: AuditService,
    private readonly requests: CertificationRequestService,
  ) {}

  /** Confirmation d'adhésion : seule la référence fournie par la CCI-Togo est stockée (DP-CCI). */
  async confirmMembership(organisationId: string, confirmationRef: string, officer: Principal, correlationId: string): Promise<void> {
    const org = (await this.db.select({ id: organisations.id }).from(organisations).where(eq(organisations.id, organisationId)).limit(1))[0];
    if (!org) throw new DealPmeError(ErrorCode.NOT_FOUND, "Organisation introuvable");
    await this.db.transaction(async (tx) => {
      await tx.insert(membershipConfirmations).values({ id: newId(), organisationId, confirmationRef, confirmedBy: officer.userId });
      await tx.update(organisations).set({ cciMemberConfirmationRef: confirmationRef }).where(eq(organisations.id, organisationId));
      await this.audit.record({ action: "MEMBERSHIP_CONFIRMED", actorUserId: officer.userId, subjectType: "organisation", subjectId: organisationId, outcome: "OK", correlationId }, tx);
    });
  }

  /**
   * Vérification RCCM / CFE. Le résultat est stocké dans registry_record, séparément des données déclarées (DP-CCI-005).
   * En mode manuel, l'officier saisit ce qu'il a consulté ; sourceRef trace la consultation.
   */
  async verifyRegistry(companyId: string, rawRccm: string, officer: Principal, correlationId: string, manualResult?: ManualRegistryResult, options: { requestId?: string | undefined; fallbackFromId?: string | undefined; fallbackReason?: string | undefined } = {}) {
    const rccmNumber = normalizeRccm(rawRccm);
    const requestId = options.requestId ?? newId();
    const requestHash = createHash("sha256").update(JSON.stringify([rccmNumber, manualResult ?? null, options.fallbackFromId ?? null, options.fallbackReason ?? null])).digest("hex");
    return withTenant(this.db, officer, async (tx) => {
      // Sérialise les consultations, la modification d'identité et l'octroi. Le transport est borné.
      const company = (await tx.select().from(companies).where(eq(companies.id, companyId)).for("update").limit(1))[0];
      if (!company) throw new DealPmeError(ErrorCode.NOT_FOUND, "Entreprise introuvable");
      if (company.ownerOrganisationId === officer.organisationId) throw new DealPmeError(ErrorCode.FORBIDDEN, "L'officier ne peut pas vérifier sa propre entreprise");
      const prior = (await tx.select().from(registryConsultations).where(and(eq(registryConsultations.companyId, companyId), eq(registryConsultations.requestId, requestId))).limit(1))[0];
      if (prior) {
        if (prior.requestHash !== requestHash || prior.officerUserId !== officer.userId) throw new DealPmeError(ErrorCode.INVALID_TRANSITION, "Identifiant de requête déjà utilisé pour une autre consultation");
        return { consultationId: prior.id, registryRecordId: prior.registryRecordId, outcome: prior.outcome, synthetic: prior.synthetic };
      }
      if (normalizeRccm(company.rccmNumber ?? "") !== rccmNumber) throw new DealPmeError(ErrorCode.VALIDATION_FAILED, "Le numéro consulté doit correspondre au numéro déclaré");
      if (this.registry.mode === "manual" && !manualResult) throw new DealPmeError(ErrorCode.VALIDATION_FAILED, "Saisie manuelle complète et source requises");
      if (this.registry.mode === "api" && manualResult) {
        const latest = (await tx.select().from(registryConsultations).where(eq(registryConsultations.companyId, companyId)).orderBy(desc(registryConsultations.createdAt), desc(registryConsultations.id)).limit(1))[0];
        if (!options.fallbackReason || !latest || latest.id !== options.fallbackFromId || latest.outcome !== "UNAVAILABLE") throw new DealPmeError(ErrorCode.INVALID_TRANSITION, "Reprise manuelle : incident courant et motif requis");
      }
      let result: RegistryLookupResult | null = null;
      let outcome: string;
      let reason = manualResult?.reason ?? options.fallbackReason ?? null;
      const mode = manualResult ? "manual" : "api";
      try {
        result = manualResult
          ? { found: true, legalName: manualResult.legalName, legalForm: manualResult.legalForm, status: manualResult.status, sourceRef: manualResult.sourceRef, verifiedAt: new Date().toISOString(), provider: "manual", synthetic: false }
          : await this.registry.lookup({ rccmNumber });
        outcome = manualResult && manualResult.decision !== "CONFIRMED" ? manualResult.decision : registryOutcome(result, company, rccmNumber);
      } catch (error) {
        if (!(error instanceof RegistryError)) throw error;
        outcome = "UNAVAILABLE";
        reason = error.code;
      }
      const recordId = outcome === "CONFIRMED" && result && !result.synthetic ? newId() : null;
      if (recordId && result) await tx.insert(registryRecords).values({
        id: recordId, companyId, rccmNumber, legalName: result.legalName!, legalForm: result.legalForm as typeof company.legalForm,
        status: result.status!, registeredAddress: result.registeredAddress ?? null, officers: result.officers ?? [],
        verifiedAt: new Date(result.verifiedAt), verifiedBy: officer.userId, sourceRef: result.sourceRef, mode,
      });
      const consultationId = newId();
      const synthetic = result?.synthetic ?? (!manualResult && this.registry.provider === "mock");
      await tx.insert(registryConsultations).values({
        id: consultationId, companyId, requestId, requestHash, officerUserId: officer.userId, rccmNumber,
        declaredIdentity: { legalName: company.legalName, legalForm: company.legalForm, rccmNumber: company.rccmNumber },
        mode, provider: result?.provider ?? this.registry.provider, synthetic, outcome, result, reason,
        fallbackFromId: options.fallbackFromId ?? null, registryRecordId: recordId, createdAt: new Date(),
      });
      await tx.update(companies).set({ registryRecordId: recordId }).where(eq(companies.id, companyId));
      await this.audit.record({ action: "REGISTRY_VERIFIED", actorUserId: officer.userId, subjectType: "company", subjectId: companyId, outcome: outcome === "CONFIRMED" ? "OK" : "FAILED", correlationId, metadata: { mode, outcome, synthetic, consultationId, fallbackFromId: options.fallbackFromId ?? null, fallbackReason: options.fallbackReason ?? null, decisionReason: manualResult?.reason ?? null } }, tx);
      return { consultationId, registryRecordId: recordId, outcome, synthetic };
    });
  }

  /**
   * Décision de certification Deal-Ready : nominative, jamais automatique (DP-CCI-006).
   * Un officier ayant déclaré un conflit d'intérêts est bloqué par le schéma d'entrée.
   * Préalable : une vérification RCCM / CFE existe pour l'entreprise ; sans elle, l'octroi est refusé.
   */
  async decideCertification(req: CertificationDecisionRequest, officer: Principal, correlationId: string) {
    const id = newId();
    let registryDenied = false;
    try { await withTenant(this.db, officer, async (tx) => {
      const company = (await tx.select().from(companies).where(eq(companies.id, req.companyId)).for("update").limit(1))[0];
      if (!company) throw new DealPmeError(ErrorCode.NOT_FOUND, "Entreprise introuvable");
      if (company.ownerOrganisationId === officer.organisationId) throw new DealPmeError(ErrorCode.FORBIDDEN, "Décision sur sa propre entreprise interdite");
      const record = company.registryRecordId ? (await tx.select().from(registryRecords).where(and(eq(registryRecords.id, company.registryRecordId), eq(registryRecords.companyId, company.id))).limit(1))[0] : undefined;
      if (req.decision === "GRANTED" && (!record || registryOutcome({ ...record, found: true }, company, record.rccmNumber) !== "CONFIRMED")) {
        registryDenied = true;
        throw new DealPmeError(ErrorCode.INVALID_TRANSITION, "La certification exige une vérification RCCM / CFE réelle et conforme à l'identité courante", { reason: "REGISTRY_NOT_VERIFIED" });
      }
      await tx.insert(certifications).values({
      id,
      companyId: req.companyId,
      scopeStatement: req.scopeStatement,
      decision: req.decision,
      officerUserId: officer.userId,
      expiresAt: req.expiresAt ? new Date(req.expiresAt) : null,
      revocationReason: req.decision === "REVOKED" ? (req.reason ?? "Motif non renseigné") : null,
      });
    // Une décision clôt les demandes en cours : l'entreprise voit son instruction aboutie, pas une file muette.
      await this.requests.closeOpenRequests(req.companyId, id, tx);
      await this.audit.record({ action: "CERTIFICATION_DECIDED", actorUserId: officer.userId, subjectType: "company", subjectId: req.companyId, outcome: "OK", correlationId, metadata: { decision: req.decision } }, tx);
    }); } catch (error) {
      if (registryDenied) await this.audit.rejection({ action: "CERTIFICATION_DECIDED", actorUserId: officer.userId, subjectType: "company", subjectId: req.companyId, outcome: "FAILED", correlationId, metadata: { decision: req.decision, reason: "REGISTRY_NOT_VERIFIED" } });
      throw error;
    }
    return { certificationId: id };
  }

  /** Statut courant du badge : dernière décision non expirée. Le texte de portée est toujours renvoyé avec le badge. */
  async currentCertification(companyId: string) {
    const row = (await this.db.select().from(certifications).where(eq(certifications.companyId, companyId)).orderBy(desc(certifications.decidedAt)).limit(1))[0];
    const s = statusOf(row);
    return { isDealReady: s.isDealReady, scopeStatement: s.scopeStatement, decidedAt: s.decidedAt, officerUserId: s.officerUserId };
  }

  // ---------------------------------------------------------------- lectures de la console (agrégats et listes, jamais le contenu confidentiel d'un dossier)

  /** Tableau de bord institutionnel : compteurs uniquement (DP-GOV). */
  async overview(officer: Principal) {
    const [orgs] = await this.db.select({ total: sql<number>`count(*)::int`, confirmed: sql<number>`count(distinct ${membershipConfirmations.organisationId})::int` }).from(organisations).leftJoin(membershipConfirmations, eq(membershipConfirmations.organisationId, organisations.id));
    const [comps] = await withTenant(this.db, officer, async (tx) => tx.select({ total: sql<number>`count(*)::int`, verified: sql<number>`count(${companies.registryRecordId})::int` }).from(companies));
    const latest = await this.latestCertifications();
    const certified = latest.filter((c) => statusOf(c).isDealReady).length;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [month] = await this.db.select({ n: sql<number>`count(*)::int` }).from(certifications).where(gte(certifications.decidedAt, monthStart));
    const dealCounts = await withTenant(this.db, officer, async (tx) => {
      const rows = await tx.select({ status: deals.status, n: sql<number>`count(*)::int` }).from(deals).groupBy(deals.status);
      return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
    });
    return {
      organisations: { total: orgs?.total ?? 0, membershipConfirmed: orgs?.confirmed ?? 0 },
      companies: { total: comps?.total ?? 0, registryVerified: comps?.verified ?? 0, dealReady: certified },
      certifications: { decisionsThisMonth: month?.n ?? 0 },
      deals: dealCounts,
    };
  }

  /** Organisations inscrites et état de confirmation d'adhésion. La base des membres n'est jamais importée. */
  async listOrganisations() {
    const rows = await this.db
      .select({
        id: organisations.id,
        name: organisations.name,
        attributionChannel: organisations.attributionChannel,
        confirmationRef: organisations.cciMemberConfirmationRef,
        createdAt: organisations.createdAt,
        companies: sql<number>`count(distinct ${companies.id})::int`,
        confirmedAt: sql<Date | null>`max(${membershipConfirmations.confirmedAt})`,
      })
      .from(organisations)
      .leftJoin(companies, eq(companies.ownerOrganisationId, organisations.id))
      .leftJoin(membershipConfirmations, eq(membershipConfirmations.organisationId, organisations.id))
      .groupBy(organisations.id)
      .orderBy(desc(organisations.createdAt));
    return { items: rows };
  }

  /** Entreprises : données déclarées, vérification registre et statut de certification, présentés côte à côte, jamais fusionnés. */
  async listCompanies(officer: Principal) {
    const rows = await withTenant(this.db, officer, async (tx) => tx
      .select({
        id: companies.id,
        legalName: companies.legalName,
        legalForm: companies.legalForm,
        rccmNumber: companies.rccmNumber,
        registryRecordId: companies.registryRecordId,
        ownerOrganisationId: companies.ownerOrganisationId,
        ownerName: organisations.name,
        createdAt: companies.createdAt,
      })
      .from(companies)
      .innerJoin(organisations, eq(organisations.id, companies.ownerOrganisationId))
      .orderBy(desc(companies.createdAt)));
    const latest = await this.latestCertifications();
    const byCompany = new Map(latest.map((c) => [c.companyId, statusOf(c)]));
    const recordIds = rows.map((r) => r.registryRecordId).filter((x): x is string => !!x);
    const records = recordIds.length ? await withTenant(this.db, officer, async (tx) => tx.select().from(registryRecords).where(inArray(registryRecords.id, recordIds))) : [];
    const byRecord = new Map(records.map((r) => [r.id, r]));
    return {
      items: rows.map((r) => {
        const rec = r.registryRecordId ? byRecord.get(r.registryRecordId) : undefined;
        return {
          id: r.id,
          declared: { legalName: r.legalName, legalForm: r.legalForm, rccmNumber: r.rccmNumber },
          owner: { id: r.ownerOrganisationId, name: r.ownerName },
          registry: rec ? { legalName: rec.legalName, legalForm: rec.legalForm, status: rec.status, verifiedAt: rec.verifiedAt, mode: rec.mode, sourceRef: rec.sourceRef } : null,
          certification: byCompany.get(r.id) ?? statusOf(undefined),
          createdAt: r.createdAt,
        };
      }),
    };
  }

  /** Détail d'une entreprise pour l'instruction : déclaré, registre, historique des décisions. */
  async companyDetail(companyId: string, officer: Principal) {
    const row = await withTenant(this.db, officer, async (tx) => (
      await tx
        .select({ id: companies.id, legalName: companies.legalName, legalForm: companies.legalForm, rccmNumber: companies.rccmNumber, registryRecordId: companies.registryRecordId, ownerId: organisations.id, ownerName: organisations.name, createdAt: companies.createdAt })
        .from(companies)
        .innerJoin(organisations, eq(organisations.id, companies.ownerOrganisationId))
        .where(eq(companies.id, companyId))
        .limit(1)
    )[0]);
    if (!row) throw new DealPmeError(ErrorCode.NOT_FOUND, "Entreprise introuvable");
    const [confirmation] = await this.db
      .select({ confirmedAt: sql<Date | null>`max(${membershipConfirmations.confirmedAt})` })
      .from(membershipConfirmations)
      .where(eq(membershipConfirmations.organisationId, row.ownerId));
    const ownerConfirmedAt = confirmation?.confirmedAt ?? null;
    const rec = row.registryRecordId ? await withTenant(this.db, officer, async (tx) => (await tx.select().from(registryRecords).where(eq(registryRecords.id, row.registryRecordId!)).limit(1))[0]) : undefined;
    const history = await withTenant(this.db, officer, async (tx) => tx
      .select({ id: certifications.id, decision: certifications.decision, scopeStatement: certifications.scopeStatement, decidedAt: certifications.decidedAt, expiresAt: certifications.expiresAt, revocationReason: certifications.revocationReason, officerEmail: users.email })
      .from(certifications)
      .leftJoin(users, eq(users.id, certifications.officerUserId))
      .where(eq(certifications.companyId, companyId))
      .orderBy(desc(certifications.decidedAt)));
    const latest = (await this.db.select().from(certifications).where(eq(certifications.companyId, companyId)).orderBy(desc(certifications.decidedAt)).limit(1))[0];
    const companyDeals = await withTenant(this.db, officer, async (tx) =>
      tx
        .select({ id: deals.id, dealType: deals.dealType, status: deals.status, sectorCode: deals.sectorCode, createdAt: deals.createdAt })
        .from(deals)
        .where(eq(deals.companyId, companyId))
        .orderBy(desc(deals.createdAt)),
    );
    const consultationHistory = await withTenant(this.db, officer, async (tx) => tx.select({
      id: registryConsultations.id, outcome: registryConsultations.outcome, mode: registryConsultations.mode,
      provider: registryConsultations.provider, synthetic: registryConsultations.synthetic, result: registryConsultations.result,
      reason: registryConsultations.reason, officerUserId: registryConsultations.officerUserId, createdAt: registryConsultations.createdAt,
      declaredIdentity: registryConsultations.declaredIdentity, fallbackFromId: registryConsultations.fallbackFromId,
    }).from(registryConsultations).where(eq(registryConsultations.companyId, companyId)).orderBy(desc(registryConsultations.createdAt), desc(registryConsultations.id)).limit(100));
    return {
      id: row.id,
      deals: companyDeals,
      declared: { legalName: row.legalName, legalForm: row.legalForm, rccmNumber: row.rccmNumber, createdAt: row.createdAt },
      owner: { id: row.ownerId, name: row.ownerName, membershipConfirmed: !!ownerConfirmedAt, membershipConfirmedAt: ownerConfirmedAt },
      registry: rec ? { legalName: rec.legalName, legalForm: rec.legalForm, status: rec.status, registeredAddress: rec.registeredAddress, officers: rec.officers, verifiedAt: rec.verifiedAt, mode: rec.mode, sourceRef: rec.sourceRef } : null,
      registryMode: this.registry.mode,
      registryProvider: this.registry.provider,
      consultationHistory: consultationHistory.map((c) => ({ ...c, stale: c.declaredIdentity.legalName !== row.legalName || c.declaredIdentity.legalForm !== row.legalForm || c.declaredIdentity.rccmNumber !== row.rccmNumber })),
      certification: statusOf(latest),
      history,
    };
  }

  /** Journal des décisions de certification : chaque décision porte un officier nommé et un horodatage ; exportable. */
  async listCertifications(officer: Principal) {
    const rows = await withTenant(this.db, officer, async (tx) => tx
      .select({
        id: certifications.id,
        companyId: certifications.companyId,
        companyName: companies.legalName,
        decision: certifications.decision,
        scopeStatement: certifications.scopeStatement,
        decidedAt: certifications.decidedAt,
        expiresAt: certifications.expiresAt,
        revocationReason: certifications.revocationReason,
        officerEmail: users.email,
      })
      .from(certifications)
      .innerJoin(companies, eq(companies.id, certifications.companyId))
      .leftJoin(users, eq(users.id, certifications.officerUserId))
      .orderBy(desc(certifications.decidedAt)));
    return { items: rows };
  }

  async certificationsCsv(officer: Principal): Promise<string> {
    const { items } = await this.listCertifications(officer);
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["id", "entreprise_id", "entreprise", "decision", "officier", "decide_le", "expire_le", "portee", "motif_retrait"].join(";");
    const lines = items.map((r) => [r.id, r.companyId, r.companyName, r.decision, r.officerEmail, r.decidedAt.toISOString(), r.expiresAt?.toISOString() ?? "", r.scopeStatement, r.revocationReason ?? ""].map(esc).join(";"));
    return "﻿" + [head, ...lines].join("\r\n") + "\r\n";
  }

  private async latestCertifications() {
    // Dernière décision par entreprise (DISTINCT ON), pour les compteurs et les listes.
    return this.db
      .select()
      .from(certifications)
      .where(and(isNotNull(certifications.decidedAt), sql`${certifications.id} in (select distinct on (company_id) id from certification order by company_id, decided_at desc)`));
  }
}
