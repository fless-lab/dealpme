/**
 * SMS transactionnels (OTP, notices critiques). Fournisseur distinct de l'email. Consentement et désinscription gérés côté API.
 * Ce fichier est le contrat : l'API ne dépend que de ce port, jamais d'un vendeur.
 */
export interface SmsMessage {
  toE164: string;
  text: string; // français, sans caractère exotique pour limiter la segmentation
  category: "OTP" | "TRANSACTIONAL" | "MARKETING";
}
export interface SmsPort {
  send(msg: SmsMessage): Promise<{ providerRef: string }>;
}
