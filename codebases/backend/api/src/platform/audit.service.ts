import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@dealpme/domain";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { CORE_DB, type CoreDb } from "../database/database.module.js";
import type { CoreTx } from "../database/tenant.js";
import { auditEvents } from "../database/schema/core.js";

/**
 * Journal d'audit des actions sensibles, persisté dans la table append-only audit_event (base core).
 * Ne contient jamais le corps d'un document, une pièce d'identité ni le texte complet d'une réponse IA :
 * identifiants, action, résultat, corrélation. La transaction de l'action porte aussi
 * sa preuve ; les refus indépendants survivent à l'annulation de l'action.
 */
export type AuditAction =
  | "USER_REGISTERED"
  | "SESSION_CREATED"
  | "SESSION_REVOKED"
  | "LOGIN_FAILED"
  | "ACCOUNT_LOCKED"
  | "RATE_LIMITED"
  | "WEBHOOK_REJECTED"
  | "OTP_ISSUED"
  | "OTP_DELIVERY_FAILED"
  | "OTP_FAILED"
  | "EMAIL_VERIFIED"
  | "MEMBERSHIP_CONFIRMED"
  | "REGISTRY_VERIFIED"
  | "CERTIFICATION_DECIDED"
  | "CERTIFICATION_REQUESTED"
  | "CERTIFICATION_REQUEST_WITHDRAWN"
  | "CERTIFICATION_REMEDIATION_REQUIRED"
  | "DEAL_CREATED"
  | "DEAL_TRANSITION"
  | "DEAL_PUBLICATION_BLOCKED"
  | "INTEREST_EXPRESSED"
  | "EVENT_REGISTERED"
  | "EVENT_CONSENT_CHANGED"
  | "MESSAGE_SENT"
  | "MESSAGE_BLOCKED"
  | "ALERT_SAVED"
  | "ALERT_OPT_IN_CHANGED"
  | "ALERT_REVOKED"
  | "DEAL_FACT_DECLARED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_READ"
  | "DOCUMENT_REJECTED_INFECTED"
  | "VALUATION_COMPUTED"
  | "PRIVILEGED_ACCESS_USED";

export interface AuditEvent {
  id: string;
  action: AuditAction;
  actorUserId: string | null;
  subjectType: string;
  subjectId: string;
  outcome: "OK" | "BLOCKED" | "FAILED";
  correlationId: string;
  occurredAt: Date;
  metadata?: Record<string, string | number | boolean | null>;
}

@Injectable()
export class AuditService {
  constructor(@Inject(CORE_DB) private readonly db: CoreDb) {}

  /** Obligatoirement attendu et appelé avec la transaction métier. Aucun cache de succès en mémoire. */
  record(event: Omit<AuditEvent, "id" | "occurredAt">, tx: CoreTx): Promise<AuditEvent> {
    return this.persist(event, tx);
  }

  /** Ne pas inscrire un refus dans la transaction que l'on s'apprête à annuler. */
  rejection(event: Omit<AuditEvent, "id" | "occurredAt" | "outcome"> & { outcome: "FAILED" | "BLOCKED" }): Promise<AuditEvent> {
    return this.persist(event, this.db);
  }

  private async persist(event: Omit<AuditEvent, "id" | "occurredAt">, executor: Pick<CoreDb, "insert">): Promise<AuditEvent> {
    const full: AuditEvent = { ...event, id: newId(), occurredAt: new Date() };
    try {
      await executor
        .insert(auditEvents)
        .values({
          id: full.id,
          action: full.action,
          actorUserId: full.actorUserId,
          subjectType: full.subjectType,
          subjectId: full.subjectId,
          outcome: full.outcome,
          correlationId: full.correlationId,
          metadata: full.metadata ?? null,
          occurredAt: full.occurredAt,
        });
    } catch {
      // Ne pas exposer la requête SQL ni le contenu de l'événement dans les logs d'erreur.
      throw new DealPmeError(ErrorCode.INTERNAL, "Journal d'audit indisponible : l'action n'a pas été confirmée.", { reason: "AUDIT_UNAVAILABLE" });
    }
    return full;
  }
}
