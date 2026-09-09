import type { RegistryPort } from "../port.js";

/**
 * Adaptateur cfe-api pour le connecteur registry.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface CfeApiConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export function createCfeApiAdapter(_config: CfeApiConfig): RegistryPort {
  throw new Error("Adaptateur cfe-api non implémenté : intégration prévue selon la feuille de route");
}
