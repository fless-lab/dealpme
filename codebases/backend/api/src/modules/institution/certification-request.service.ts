import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { newId } from "@dealpme/domain";
import { dealReadyChecklist, DEAL_READY_LIMITS, DEAL_READY_SCOPE, type DealReadyChecklist } from "@dealpme/rules";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { certificationRequests, certifications, companies, dealDocuments, deals, membershipConfirmations } from "../../database/schema/core.js";
import { withTenant, type CoreTx } from "../../database/tenant.js";
import { AuditService } from "../../platform/audit.service.js";
import type { Principal } from "../../platform/auth.js";

const OPEN_STATES = ["REQUESTED", "REMEDIATION_REQUIRED"] as const;
const SUBMITTED_STATUSES = ["PENDING_VERIFICATION", "VERIFIED", "LISTED_OPEN", "LISTED_RESTRICTED", "ENGAGED", "DUE_DILIGENCE", "NEGOTIATION", "CLOSED_REPORTED"] as const;

/**
 * Instruction des demandes de certification Deal-Ready (P06). La liste de contrôle est calculée par
 * @dealpme/rules et servie identique aux deux côtés : l'entreprise voit ce que l'officier verra.
 * Rien ici ne décide : la décision reste dans InstitutionService, nominative et journalisée.
 */
@Injectable()
export class CertificationRequestService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly audit: AuditService,
  ) {}

  /** Liste de contrôle d'une entreprise, calculée sur l'état réel de ses vérifications, dossiers et pièces. */
  async checklistFor(companyId: string, principal: Principal): Promise<DealReadyChecklist & { scope: string; limits: string[] }> {
    const facts = await this.factsFor(companyId, principal);
    return { ...dealReadyChecklist(facts), scope: DEAL_READY_SCOPE, limits: DEAL_READY_LIMITS };
  }

  /**
   * Dossier de certification vu par l'entreprise : liste de contrôle, demande en cours, historique
   * des décisions. Une entreprise qui n'est pas la sienne est introuvable (RLS).
   */
  async companyView(companyId: string, principal: Principal) {
    const company = await withTenant(this.db, principal, async (tx) => {
      return (await tx.select({ id: companies.id, legalName: companies.legalName }).from(companies).where(eq(companies.id, companyId)).limit(1))[0];
    });
    if (!company) throw new DealPmeError(ErrorCode.NOT_FOUND, "Entreprise introuvable");
    const checklist = await this.checklistFor(companyId, principal);
    const requests = await withTenant(this.db, principal, async (tx) =>
      tx.select().from(certificationRequests).where(eq(certificationRequests.companyId, companyId)).orderBy(desc(certificationRequests.requestedAt)),
    );
    const decisions = await withTenant(this.db, principal, async (tx) =>
      tx
        .select({ id: certifications.id, decision: certifications.decision, scopeStatement: certifications.scopeStatement, decidedAt: certifications.decidedAt, expiresAt: certifications.expiresAt, revocationReason: certifications.revocationReason })
        .from(certifications)
        .where(eq(certifications.companyId, companyId))
        .orderBy(desc(certifications.decidedAt)),
    );
    const latest = decisions[0];
    const expired = latest?.expiresAt ? latest.expiresAt.getTime() < Date.now() : false;
    return {
      company,
      checklist,
      open: requests.find((r) => (OPEN_STATES as readonly string[]).includes(r.state)) ?? null,
      requests,
      decisions,
      certification: {
        isDealReady: latest?.decision === "GRANTED" && !expired,
        decision: latest?.decision ?? null,
        scopeStatement: latest?.scopeStatement ?? null,
        decidedAt: latest?.decidedAt ?? null,
        expiresAt: latest?.expiresAt ?? null,
      },
    };
  }

  /**
   * Dépôt d'une demande. Refusée si des critères bloquants manquent : l'entreprise saurait de toute façon
   * quoi produire, et une file de demandes incomplètes coûte du temps d'officier. Refusée aussi si une
   * demande est déjà ouverte, pour ne pas empiler les doublons.
   */
  async request(companyId: string, message: string | null, seller: Principal, correlationId: string): Promise<{ requestId: string }> {
    const checklist = await this.checklistFor(companyId, seller);
    if (!checklist.requestable) {
      throw new DealPmeError(ErrorCode.INVALID_TRANSITION, "La demande ne peut pas être déposée tant que des éléments manquent.", {
        reason: "CHECKLIST_INCOMPLETE",
        missing: checklist.criteria.filter((c) => c.blocking && c.state === "MISSING").map((c) => ({ key: c.key, label: c.label, remedy: c.remedy })),
      });
    }
    const id = newId();
    await withTenant(this.db, seller, async (tx) => {
      const company = (await tx.select({ id: companies.id, owner: companies.ownerOrganisationId }).from(companies).where(eq(companies.id, companyId)).limit(1))[0];
      if (!company) throw new DealPmeError(ErrorCode.NOT_FOUND, "Entreprise introuvable");
      if (company.owner !== seller.organisationId) throw new DealPmeError(ErrorCode.FORBIDDEN, "Seul le détenteur de l'entreprise dépose la demande");
      const open = (
        await tx
          .select({ id: certificationRequests.id })
          .from(certificationRequests)
          .where(and(eq(certificationRequests.companyId, companyId), inArray(certificationRequests.state, [...OPEN_STATES])))
          .limit(1)
      )[0];
      if (open) throw new DealPmeError(ErrorCode.CONFLICT, "Une demande est déjà en cours d'instruction pour cette entreprise");
      await tx.insert(certificationRequests).values({ id, companyId, message, requestedBy: seller.userId });
      await this.audit.record({ action: "CERTIFICATION_REQUESTED", actorUserId: seller.userId, subjectType: "company", subjectId: companyId, outcome: "OK", correlationId }, tx);
    });
    return { requestId: id };
  }

  /** Retrait d'une demande par l'entreprise, tant qu'aucune décision n'est prise. */
  async withdraw(requestId: string, seller: Principal, correlationId: string): Promise<void> {
    await withTenant(this.db, seller, async (tx) => {
      const row = (await tx.select().from(certificationRequests).where(eq(certificationRequests.id, requestId)).limit(1))[0];
      if (!row) throw new DealPmeError(ErrorCode.NOT_FOUND, "Demande introuvable");
      if (!(OPEN_STATES as readonly string[]).includes(row.state)) throw new DealPmeError(ErrorCode.INVALID_TRANSITION, "Cette demande n'est plus en cours");
      await tx.update(certificationRequests).set({ state: "WITHDRAWN", closedAt: new Date() }).where(eq(certificationRequests.id, requestId));
      await this.audit.record({ action: "CERTIFICATION_REQUEST_WITHDRAWN", actorUserId: seller.userId, subjectType: "company", subjectId: row.companyId, outcome: "OK", correlationId }, tx);
    });
  }

  /** File d'instruction de l'officier : demandes ouvertes d'abord, avec l'état de la liste de contrôle. */
  async queue(officer: Principal) {
    const rows = await withTenant(this.db, officer, async (tx) =>
      tx
        .select({
          id: certificationRequests.id,
          companyId: certificationRequests.companyId,
          companyName: companies.legalName,
          state: certificationRequests.state,
          message: certificationRequests.message,
          remediationItems: certificationRequests.remediationItems,
          requestedAt: certificationRequests.requestedAt,
          closedAt: certificationRequests.closedAt,
        })
        .from(certificationRequests)
        .innerJoin(companies, eq(companies.id, certificationRequests.companyId))
        .orderBy(desc(certificationRequests.requestedAt)),
    );
    const withChecklist = await Promise.all(
      rows.map(async (r) => ({ ...r, checklist: (OPEN_STATES as readonly string[]).includes(r.state) ? await this.checklistFor(r.companyId, officer) : null })),
    );
    return { items: withChecklist };
  }

  /**
   * Remédiation demandée : l'officier nomme ce qui manque. Le dossier revient à l'entreprise sans être
   * refusé, et chaque point est libellé, jamais laissé à l'interprétation.
   */
  async requireRemediation(requestId: string, items: { label: string; detail: string | null }[], officer: Principal, correlationId: string): Promise<void> {
    if (items.length === 0) throw new DealPmeError(ErrorCode.VALIDATION_FAILED, "Une remédiation nomme au moins un point à reprendre");
    await withTenant(this.db, officer, async (tx) => {
      const row = (await tx.select().from(certificationRequests).where(eq(certificationRequests.id, requestId)).limit(1))[0];
      if (!row) throw new DealPmeError(ErrorCode.NOT_FOUND, "Demande introuvable");
      if (!(OPEN_STATES as readonly string[]).includes(row.state)) throw new DealPmeError(ErrorCode.INVALID_TRANSITION, "Cette demande n'est plus en cours");
      await tx
        .update(certificationRequests)
        .set({ state: "REMEDIATION_REQUIRED", remediationItems: items, remediationSetBy: officer.userId, remediationSetAt: new Date() })
        .where(eq(certificationRequests.id, requestId));
      await this.audit.record({ action: "CERTIFICATION_REMEDIATION_REQUIRED", actorUserId: officer.userId, subjectType: "company", subjectId: row.companyId, outcome: "OK", correlationId, metadata: { items: items.length } }, tx);
    });
  }

  /** Clôture des demandes ouvertes d'une entreprise au moment d'une décision. Appelée par InstitutionService. */
  async closeOpenRequests(companyId: string, certificationId: string, tx: CoreTx): Promise<void> {
      await tx
        .update(certificationRequests)
        .set({ state: "DECIDED", certificationId, closedAt: new Date() })
        .where(and(eq(certificationRequests.companyId, companyId), inArray(certificationRequests.state, [...OPEN_STATES]), isNull(certificationRequests.closedAt)));
  }

  // ---------------------------------------------------------------- internes

  /** Faits de la liste de contrôle, lus dans le contexte du demandeur : rien qui sorte de son périmètre. */
  private async factsFor(companyId: string, principal: Principal) {
    return withTenant(this.db, principal, async (tx) => {
      const company = (await tx.select({ id: companies.id, owner: companies.ownerOrganisationId, registryRecordId: companies.registryRecordId }).from(companies).where(eq(companies.id, companyId)).limit(1))[0];
      if (!company) throw new DealPmeError(ErrorCode.NOT_FOUND, "Entreprise introuvable");
      const [membership] = await tx.select({ n: sql<number>`count(*)::int` }).from(membershipConfirmations).where(eq(membershipConfirmations.organisationId, company.owner));
      const companyDeals = await tx.select({ id: deals.id, status: deals.status }).from(deals).where(eq(deals.companyId, companyId));
      const submitted = companyDeals.some((d) => (SUBMITTED_STATUSES as readonly string[]).includes(d.status));
      const dealIds = companyDeals.map((d) => d.id);
      const docs = dealIds.length
        ? await tx
            .selectDistinct({ category: dealDocuments.category })
            .from(dealDocuments)
            .where(and(inArray(dealDocuments.dealId, dealIds), eq(dealDocuments.scanState, "CLEAN"), ne(dealDocuments.category, "")))
        : [];
      return {
        registryVerified: !!company.registryRecordId,
        membershipConfirmed: (membership?.n ?? 0) > 0,
        dossierSubmitted: submitted,
        documentCategories: docs.map((d) => d.category),
      };
    });
  }
}
