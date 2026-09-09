import type { AiProviderPort } from "../port.js";

/**
 * Adaptateur contracted-provider pour le connecteur ai-provider.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface ContractedProviderConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export function createContractedProviderAdapter(_config: ContractedProviderConfig): AiProviderPort {
  throw new Error("Adaptateur contracted-provider non implémenté : intégration prévue selon la feuille de route");
}
