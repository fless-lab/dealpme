import type { StoragePort } from "../port.js";

/**
 * Adaptateur s3 pour le connecteur storage.
 * À implémenter lors de l'intégration réelle (contrat signé, clés en variables d'environnement, jamais dans le code).
 */
export interface S3Config {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export function createS3Adapter(_config: S3Config): StoragePort {
  throw new Error("Adaptateur s3 non implémenté : intégration prévue selon la feuille de route");
}
