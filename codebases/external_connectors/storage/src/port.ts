/**
 * Stockage objet compatible S3 (MinIO en local). Chiffrement côté serveur, versionnage, aucun accès public, URL pré-signées courtes liées à la session.
 * Ce fichier est le contrat : l'API ne dépend que de ce port, jamais d'un vendeur.
 */
export interface PutObjectRequest {
  bucket: string;
  key: string;
  body: Uint8Array;
  contentType: string;
  classification: "PERSONAL" | "SENSITIVE_PERSONAL" | "CONFIDENTIAL_DEAL" | "INTERNAL";
}
export interface StoragePort {
  put(req: PutObjectRequest): Promise<{ versionId: string; sha256: string }>;
  get(bucket: string, key: string): Promise<Uint8Array>;
  /** Durée maximale courte (secondes). L'URL doit être invalidable en moins de 60 s via rotation de clé de session. */
  presignedGetUrl(bucket: string, key: string, ttlSeconds: number, sessionBinding: string): Promise<string>;
  delete(bucket: string, key: string): Promise<void>;
}
