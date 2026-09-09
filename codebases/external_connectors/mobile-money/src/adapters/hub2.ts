import type { MobileMoneyPort } from "../port.js";

/**
 * Adaptateur hub2 pour le connecteur mobile-money.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface Hub2Config {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export function createHub2Adapter(_config: Hub2Config): MobileMoneyPort {
  throw new Error("Adaptateur hub2 non implémenté : intégration prévue selon la feuille de route");
}
