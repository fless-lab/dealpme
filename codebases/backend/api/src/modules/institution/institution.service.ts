import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import type { RegistryPort } from "@dealpme/connector-registry";
import { DealPmeError, ErrorCode, type CertificationDecisionRequest } from "@dealpme/contracts";
import { newId } from "@dealpme/domain";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { certifications, companies, deals, membershipConfirmations, organisations, registryRecords, users } from "../../database/schema/core.js";
import { withTenant } from "../../database/tenant.js";
import { AuditService } from "../../platform/audit.service.js";
import type { Principal } from "../../platform/auth.js";
import { REGISTRY_PORT } from "./registry.provider.js";

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
  return { isDealReady: row.decision === "GRANTED" && !expired, decision: row.decision, scopeStatement: row.scopeStatement, decidedAt: row.decidedAt, expiresAt: row.expiresAt, officerUserId: row.officerUserId };
}

@Injectable()
export class InstitutionService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    @Inject(REGISTRY_PORT) private readonly registry: RegistryPort,
    private readonly audit: AuditService,
  ) {}

  /** Confirmation d'adhésion : seule la référence fournie par la CCI-Togo est stockée (DP-CCI). */
  async confirmMembership(organisationId: string, confirmationRef: string, officer: Principal, correlationId: string): Promise<void> {
    const org = (await this.db.select({ id: organisations.id }).from(organisations).where(eq(organisations.id, organisationId)).limit(1))[0];
    if (!org) throw new DealPmeError(ErrorCode.NOT_FOUND, "Organisation introuvable");
    await this.db.transaction(async (tx) => {
      await tx.insert(membershipConfirmations).values({ id: newId(), organisationId, confirmationRef, confirmedBy: officer.userId });
      await tx.update(organisations).set({ cciMemberConfirmationRef: confirmationRef }).where(eq(organisations.id, organisationId));
    });
    this.audit.record({ action: "MEMBERSHIP_CONFIRMED", actorUserId: officer.userId, subjectType: "organisation", subjectId: organisationId, outcome: "OK", correlationId });
  }

  /**
   * Vérification RCCM / CFE. Le résultat est stocké dans registry_record, séparément des données déclarées (DP-CCI-005).
   * En mode manuel, l'officier saisit ce qu'il a consulté ; sourceRef trace la consultation.
   */
  async verifyRegistry(companyId: string, rccmNumber: string, officer: Principal, correlationId: string, manualResult?: { legalName: string; legalForm: string; status: string; sourceRef: string }) {
    const company = (await this.db.select().from(companies).where(eq(companies.id, companyId)).limit(1))[0];
    if (!company) throw new DealPmeError(ErrorCode.NOT_FOUND, "Entreprise introuvable");

    const result =
      this.registry.mode === "manual" && manualResult
        ? { found: true, ...manualResult, verifiedAt: new Date().toISOString() }
        : await this.registry.lookup({ rccmNumber });

    if (!result.found) {
      this.audit.record({ action: "REGISTRY_VERIFIED", actorUserId: officer.userId, subjectType: "company", subjectId: companyId, outcome: "FAILED", correlationId });
      throw new DealPmeError(ErrorCode.NOT_FOUND, "Aucune inscription trouvée au RCCM pour ce numéro");
    }
    const recordId = newId();
    await this.db.transaction(async (tx) => {
      await tx.insert(registryRecords).values({
        id: recordId,
        companyId,
        rccmNumber,
        legalName: result.legalName ?? company.legalName,
        legalForm: (result.legalForm ?? company.legalForm) as typeof company.legalForm,
        status: result.status ?? "UNKNOWN",
        registeredAddress: result.registeredAddress ?? null,
        officers: result.officers ?? [],
        verifiedAt: new Date(result.verifiedAt),
        verifiedBy: officer.userId,
        sourceRef: result.sourceRef,
        mode: this.registry.mode,
      });
      await tx.update(companies).set({ registryRecordId: recordId }).where(eq(companies.id, companyId));
    });
    this.audit.record({ action: "REGISTRY_VERIFIED", actorUserId: officer.userId, subjectType: "company", subjectId: companyId, outcome: "OK", correlationId, metadata: { mode: this.registry.mode } });
    return { registryRecordId: recordId };
  }

  /**
   * Décision de certification Deal-Ready : nominative, jamais automatique (DP-CCI-006).
   * Un officier ayant déclaré un conflit d'intérêts est bloqué par le schéma d'entrée.
   * Préalable : une vérification RCCM / CFE existe pour l'entreprise ; sans elle, l'octroi est refusé.
   */
  async decideCertification(req: CertificationDecisionRequest, officer: Principal, correlationId: string) {
    const company = (await this.db.select({ id: companies.id, registryRecordId: companies.registryRecordId }).from(companies).where(eq(companies.id, req.companyId)).limit(1))[0];
    if (!company) throw new DealPmeError(ErrorCode.NOT_FOUND, "Entreprise introuvable");
    if (req.decision === "GRANTED" && !company.registryRecordId) {
      this.audit.record({ action: "CERTIFICATION_DECIDED", actorUserId: officer.userId, subjectType: "company", subjectId: req.companyId, outcome: "FAILED", correlationId, metadata: { decision: req.decision, reason: "REGISTRY_NOT_VERIFIED" } });
      throw new DealPmeError(ErrorCode.INVALID_TRANSITION, "La certification exige une vérification RCCM / CFE préalable", { reason: "REGISTRY_NOT_VERIFIED" });
    }
    const id = newId();
    await this.db.insert(certifications).values({
      id,
      companyId: req.companyId,
      scopeStatement: req.scopeStatement,
      decision: req.decision,
      officerUserId: officer.userId,
      expiresAt: req.expiresAt ? new Date(req.expiresAt) : null,
      revocationReason: req.decision === "REVOKED" ? (req.reason ?? "Motif non renseigné") : null,
    });
    this.audit.record({ action: "CERTIFICATION_DECIDED", actorUserId: officer.userId, subjectType: "company", subjectId: req.companyId, outcome: "OK", correlationId, metadata: { decision: req.decision } });
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
    const [comps] = await this.db.select({ total: sql<number>`count(*)::int`, verified: sql<number>`count(${companies.registryRecordId})::int` }).from(companies);
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
  async listCompanies() {
    const rows = await this.db
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
      .orderBy(desc(companies.createdAt));
    const latest = await this.latestCertifications();
    const byCompany = new Map(latest.map((c) => [c.companyId, statusOf(c)]));
    const recordIds = rows.map((r) => r.registryRecordId).filter((x): x is string => !!x);
    const records = recordIds.length ? await this.db.select().from(registryRecords).where(inArray(registryRecords.id, recordIds)) : [];
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
  async companyDetail(companyId: string) {
    const row = (
      await this.db
        .select({ id: companies.id, legalName: companies.legalName, legalForm: companies.legalForm, rccmNumber: companies.rccmNumber, registryRecordId: companies.registryRecordId, ownerId: organisations.id, ownerName: organisations.name, createdAt: companies.createdAt })
        .from(companies)
        .innerJoin(organisations, eq(organisations.id, companies.ownerOrganisationId))
        .where(eq(companies.id, companyId))
        .limit(1)
    )[0];
    if (!row) throw new DealPmeError(ErrorCode.NOT_FOUND, "Entreprise introuvable");
    const [confirmation] = await this.db
      .select({ confirmedAt: sql<Date | null>`max(${membershipConfirmations.confirmedAt})` })
      .from(membershipConfirmations)
      .where(eq(membershipConfirmations.organisationId, row.ownerId));
    const ownerConfirmedAt = confirmation?.confirmedAt ?? null;
    const rec = row.registryRecordId ? (await this.db.select().from(registryRecords).where(eq(registryRecords.id, row.registryRecordId)).limit(1))[0] : undefined;
    const history = await this.db
      .select({ id: certifications.id, decision: certifications.decision, scopeStatement: certifications.scopeStatement, decidedAt: certifications.decidedAt, expiresAt: certifications.expiresAt, revocationReason: certifications.revocationReason, officerEmail: users.email })
      .from(certifications)
      .leftJoin(users, eq(users.id, certifications.officerUserId))
      .where(eq(certifications.companyId, companyId))
      .orderBy(desc(certifications.decidedAt));
    const latest = (await this.db.select().from(certifications).where(eq(certifications.companyId, companyId)).orderBy(desc(certifications.decidedAt)).limit(1))[0];
    return {
      id: row.id,
      declared: { legalName: row.legalName, legalForm: row.legalForm, rccmNumber: row.rccmNumber, createdAt: row.createdAt },
      owner: { id: row.ownerId, name: row.ownerName, membershipConfirmed: !!ownerConfirmedAt, membershipConfirmedAt: ownerConfirmedAt },
      registry: rec ? { legalName: rec.legalName, legalForm: rec.legalForm, status: rec.status, registeredAddress: rec.registeredAddress, officers: rec.officers, verifiedAt: rec.verifiedAt, mode: rec.mode, sourceRef: rec.sourceRef } : null,
      registryMode: this.registry.mode,
      certification: statusOf(latest),
      history,
    };
  }

  /** Journal des décisions de certification : chaque décision porte un officier nommé et un horodatage ; exportable. */
  async listCertifications() {
    const rows = await this.db
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
      .orderBy(desc(certifications.decidedAt));
    return { items: rows };
  }

  async certificationsCsv(): Promise<string> {
    const { items } = await this.listCertifications();
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
