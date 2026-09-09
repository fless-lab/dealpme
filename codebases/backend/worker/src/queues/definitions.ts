/**
 * Files de jobs (Redis / BullMQ). Chaque job porte une clé d'idempotence : les rappels et relances
 * ne doivent jamais produire deux effets.
 */
export const QUEUES = {
  /** Cron : rapproche les opportunités T0 des thèses d'investisseurs ; alerte uniquement avec opt-in. */
  MATCHING: "matching",
  /** SMS et email transactionnels ; le marketing exige consentement et lien de désinscription. */
  NOTIFICATIONS: "notifications",
  /** Data room : antivirus, OCR, rendu page à page avec filigrane, empreinte de version. */
  INGESTION: "ingestion",
  /** Webhooks entrants (paiement, signature, Remo) après vérification de signature côté API. */
  WEBHOOKS: "webhooks",
  /** Journalisation et purge selon la grille de rétention (corps VDR 90 jours après clôture, etc.). */
  RETENTION: "retention",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export interface MatchingJob {
  idempotencyKey: string;
  investorUserId: string;
}
export interface NotificationJob {
  idempotencyKey: string;
  channel: "SMS" | "EMAIL";
  to: string;
  templateKey: string;
  variables: Record<string, string>;
  category: "OTP" | "TRANSACTIONAL" | "MARKETING";
}
export interface IngestionJob {
  idempotencyKey: string;
  documentId: string;
  storageKey: string;
  step: "SCAN" | "OCR" | "RENDER_PAGES" | "FINGERPRINT";
}
export interface WebhookJob {
  idempotencyKey: string;
  source: "MOBILE_MONEY" | "ESIGN" | "REMO";
  payload: unknown;
}
