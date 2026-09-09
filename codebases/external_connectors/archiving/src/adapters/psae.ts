import type { ArchivingPort } from "../port.js";

/**
 * Adaptateur psae pour le connecteur archiving.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface PsaeConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export function createPsaeAdapter(_config: PsaeConfig): ArchivingPort {
  throw new Error("Adaptateur psae non implémenté : intégration prévue selon la feuille de route");
}
