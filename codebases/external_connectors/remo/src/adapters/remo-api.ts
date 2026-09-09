import type { RemoPort } from "../port.js";

/**
 * Adaptateur remo-api pour le connecteur remo.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface RemoApiConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export function createRemoApiAdapter(_config: RemoApiConfig): RemoPort {
  throw new Error("Adaptateur remo-api non implémenté : intégration prévue selon la feuille de route");
}
