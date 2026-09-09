import type { MobileMoneyPort } from "../port.js";

/**
 * Adaptateur paydunya pour le connecteur mobile-money.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface PaydunyaConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export function createPaydunyaAdapter(_config: PaydunyaConfig): MobileMoneyPort {
  throw new Error("Adaptateur paydunya non implémenté : intégration prévue selon la feuille de route");
}
