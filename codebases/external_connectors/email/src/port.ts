/**
 * Email transactionnel. En local : Mailpit. Les messages non transactionnels exigent consentement et lien de désinscription.
 * Ce fichier est le contrat : l'API ne dépend que de ce port, jamais d'un vendeur.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  category: "TRANSACTIONAL" | "MARKETING";
  unsubscribeUrl?: string; // obligatoire si MARKETING
}
export interface EmailPort {
  send(msg: EmailMessage): Promise<{ providerRef: string }>;
}
