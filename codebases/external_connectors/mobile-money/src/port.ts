/**
 * Paiement mobile money via agrégateur (CinetPay, Hub2, PayDunya, PayGate Global). Rails : T-Money, Flooz, Gozem Money. Prépayé, jamais récurrent.
 * Ce fichier est le contrat : l'API ne dépend que de ce port, jamais d'un vendeur.
 */
export interface PaymentRequest {
  idempotencyKey: string; // obligatoire : les rappels mobile money sont retentés
  amountXof: number; // entier XOF, pas de sous-unité
  payerPhoneE164: string;
  description: string;
  callbackUrl: string;
}
export type PaymentState = "AUTHORISED" | "CAPTURED" | "SETTLED" | "RECONCILED" | "FAILED";
export interface PaymentIntent {
  providerRef: string;
  state: PaymentState;
  redirectUrl?: string;
}
export interface PaymentEvent {
  providerRef: string;
  state: PaymentState;
  amountXof: number;
  occurredAt: string;
  rail?: "T_MONEY" | "FLOOZ" | "GOZEM_MONEY" | "OTHER";
}
export interface MobileMoneyPort {
  initiate(req: PaymentRequest): Promise<PaymentIntent>;
  verifyWebhook(rawBody: string, signatureHeader: string): boolean;
  parseEvent(rawBody: string): PaymentEvent;
}
