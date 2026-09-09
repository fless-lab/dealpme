import type { TaxPartnerPort } from "../port.js";

/**
 * Adaptateur partner-http pour le connecteur tax-partner.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface PartnerHttpConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export function createPartnerHttpAdapter(_config: PartnerHttpConfig): TaxPartnerPort {
  throw new Error("Adaptateur partner-http non implémenté : intégration prévue selon la feuille de route");
}
