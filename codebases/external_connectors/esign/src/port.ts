/**
 * Signature électronique qualifiée : prestataire togolais accrédité ARCEP (PSC). Parcours de repli papier géré côté API, pas ici.
 * Ce fichier est le contrat : l'API ne dépend que de ce port, jamais d'un vendeur.
 */
export interface SignatureRequest {
  documentSha256: string;
  documentTitle: string;
  signers: { personId: string; email: string; phoneE164: string }[];
  callbackUrl: string;
}
export interface SignatureEnvelope {
  providerRef: string;
  signingUrls: Record<string, string>; // personId -> URL de signature
}
export interface SignatureCompletion {
  providerRef: string;
  documentSha256: string;
  certificateChain: string;
  timestampToken: string;
  completedAt: string;
}
export interface ESignPort {
  createEnvelope(req: SignatureRequest): Promise<SignatureEnvelope>;
  /** Vérifie la signature du webhook AVANT tout traitement (exigence v0 : validation des signatures de webhook). */
  verifyWebhook(rawBody: string, signatureHeader: string): boolean;
  parseCompletion(rawBody: string): SignatureCompletion;
}
