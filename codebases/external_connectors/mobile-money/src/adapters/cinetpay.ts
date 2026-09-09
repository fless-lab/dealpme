import type { MobileMoneyPort } from "../port.js";

/**
 * Adaptateur cinetpay pour le connecteur mobile-money.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface CinetpayConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export function createCinetpayAdapter(_config: CinetpayConfig): MobileMoneyPort {
  throw new Error("Adaptateur cinetpay non implémenté : intégration prévue selon la feuille de route");
}
