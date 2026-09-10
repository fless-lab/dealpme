import { Inject, Injectable } from "@nestjs/common";
import { newId } from "@dealpme/domain";
import { CORE_DB, type CoreDb } from "../database/database.module.js";
import { auditEvents } from "../database/schema/core.js";

/**
 * Journal d'audit des actions sensibles, persisté dans la table append-only audit_event (base core).
 * Ne contient jamais le corps d'un document, une pièce d'identité ni le texte complet d'une réponse IA :
 * identifiants, action, résultat, corrélation. Un échec d'écriture est journalisé, jamais silencieux.
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
  private readonly recent: AuditEvent[] = [];

  constructor(@Inject(CORE_DB) private readonly db: CoreDb) {}

  record(event: Omit<AuditEvent, "id" | "occurredAt">): AuditEvent {
    const full: AuditEvent = { ...event, id: newId(), occurredAt: new Date() };
    this.recent.push(full);
    if (this.recent.length > 500) this.recent.shift();
    void this.db
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
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error(`[audit] écriture impossible pour ${full.action} ${full.subjectId} :`, err);
      });
    return full;
  }

  /** Utilisé par les tests pour vérifier qu'une action sensible a bien produit son événement (MISSING_AUDIT_EVENT). */
  find(action: AuditAction, subjectId?: string): AuditEvent[] {
    return this.recent.filter((e) => e.action === action && (subjectId === undefined || e.subjectId === subjectId));
  }
}
