import { Injectable } from "@nestjs/common";
import { newId } from "@dealpme/domain";

/**
 * Journal d'audit des actions sensibles (append-only). Ne contient jamais le corps d'un document,
 * une pièce d'identité ni le texte complet d'une réponse IA : identifiants, action, résultat, corrélation.
 * La persistance cible est la table audit_event de la base core ; le tampon mémoire sert au démarrage.
 */
export type AuditAction =
  | "USER_REGISTERED"
  | "SESSION_CREATED"
  | "SESSION_REVOKED"
  | "MEMBERSHIP_CONFIRMED"
  | "REGISTRY_VERIFIED"
  | "CERTIFICATION_DECIDED"
  | "DEAL_CREATED"
  | "DEAL_TRANSITION"
  | "DEAL_PUBLICATION_BLOCKED"
  | "INTEREST_EXPRESSED"
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
  private readonly buffer: AuditEvent[] = [];

  record(event: Omit<AuditEvent, "id" | "occurredAt">): AuditEvent {
    const full: AuditEvent = { ...event, id: newId(), occurredAt: new Date() };
    this.buffer.push(full);
    return full;
  }

  /** Utilisé par les tests pour vérifier qu'une action sensible a bien produit son événement (MISSING_AUDIT_EVENT). */
  find(action: AuditAction, subjectId?: string): AuditEvent[] {
    return this.buffer.filter((e) => e.action === action && (subjectId === undefined || e.subjectId === subjectId));
  }
}
