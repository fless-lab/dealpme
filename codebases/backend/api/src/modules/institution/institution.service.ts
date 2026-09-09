import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import type { RegistryPort } from "@dealpme/connector-registry";
import { DealPmeError, ErrorCode, type CertificationDecisionRequest } from "@dealpme/contracts";
import { newId } from "@dealpme/domain";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { certifications, companies, membershipConfirmations, registryRecords } from "../../database/schema/core.js";
import { AuditService } from "../../platform/audit.service.js";
import type { Principal } from "../../platform/auth.js";
import { REGISTRY_PORT } from "./registry.provider.js";

@Injectable()
export class InstitutionService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    @Inject(REGISTRY_PORT) private readonly registry: RegistryPort,
    private readonly audit: AuditService,
  ) {}

  /** Confirmation d'adhésion : seule la référence fournie par la CCI-Togo est stockée (DP-CCI). */
  async confirmMembership(organisationId: string, confirmationRef: string, officer: Principal, correlationId: string): Promise<void> {
    await this.db.insert(membershipConfirmations).values({ id: newId(), organisationId, confirmationRef, confirmedBy: officer.userId });
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
   */
  async decideCertification(req: CertificationDecisionRequest, officer: Principal, correlationId: string) {
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
    if (!row) return { isDealReady: false, scopeStatement: null };
    const expired = row.expiresAt ? row.expiresAt.getTime() < Date.now() : false;
    return { isDealReady: row.decision === "GRANTED" && !expired, scopeStatement: row.scopeStatement, decidedAt: row.decidedAt, officerUserId: row.officerUserId };
  }
}
