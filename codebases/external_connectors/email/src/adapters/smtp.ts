import type { EmailPort } from "../port.js";

/**
 * Adaptateur smtp pour le connecteur email.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface SmtpConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export function createSmtpAdapter(_config: SmtpConfig): EmailPort {
  throw new Error("Adaptateur smtp non implémenté : intégration prévue selon la feuille de route");
}
