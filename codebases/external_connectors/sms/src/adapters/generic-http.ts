import type { SmsPort } from "../port.js";

/**
 * Adaptateur generic-http pour le connecteur sms.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface GenericHttpConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export function createGenericHttpAdapter(_config: GenericHttpConfig): SmsPort {
  throw new Error("Adaptateur generic-http non implémenté : intégration prévue selon la feuille de route");
}
