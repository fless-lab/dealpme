/**
 * Fournisseur de modèle pour DealLens (V5). Aucun document VDR ne sort vers un outil public : uniquement le fournisseur sous contrat. Le filtrage des permissions a lieu AVANT l'appel.
 * Ce fichier est le contrat : l'API ne dépend que de ce port, jamais d'un vendeur.
 */
export interface AuthorizedChunk {
  documentId: string;
  versionId: string;
  page: number;
  anchor: string;
  text: string;
}
export interface GroundedAnswerRequest {
  question: string;
  /** Ensemble déjà filtré par permission ; le connecteur n'a pas le droit d'en élargir le périmètre. */
  authorizedChunks: AuthorizedChunk[];
  authorizationProfileHash: string;
  policyVersion: string;
}
export interface GroundedAnswer {
  answer: string;
  confidence: "HIGH" | "MEDIUM" | "INSUFFICIENT";
  citations: { documentId: string; versionId: string; page: number; anchor: string }[];
  potentialIssues: string[];
  openQuestions: string[];
  modelVersion: string;
}
export interface AiProviderPort {
  answer(req: GroundedAnswerRequest): Promise<GroundedAnswer>;
  embed(texts: string[]): Promise<number[][]>;
}
