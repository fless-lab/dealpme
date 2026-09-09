import type { ESignPort } from "../port.js";

/**
 * Adaptateur psc-accredited pour le connecteur esign.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface PscAccreditedConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export function createPscAccreditedAdapter(_config: PscAccreditedConfig): ESignPort {
  throw new Error("Adaptateur psc-accredited non implémenté : intégration prévue selon la feuille de route");
}
