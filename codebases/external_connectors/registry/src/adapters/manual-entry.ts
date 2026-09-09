import type { RegistryPort } from "../port.js";

/**
 * Adaptateur manual-entry pour le connecteur registry.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface ManualEntryConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export function createManualEntryAdapter(_config: ManualEntryConfig): RegistryPort {
  throw new Error("Adaptateur manual-entry non implémenté : intégration prévue selon la feuille de route");
}
