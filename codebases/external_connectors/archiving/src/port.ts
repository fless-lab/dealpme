/**
 * Archivage électronique à valeur probante (PSAE accrédité) pour la piste d'audit de signature. Une table SQL n'est pas un service d'archivage.
 * Ce fichier est le contrat : l'API ne dépend que de ce port, jamais d'un vendeur.
 */
export interface ArchiveRequest {
  documentSha256: string;
  payload: Uint8Array;
  metadata: Record<string, string>;
  retentionYears: number; // 10 ans pour les preuves de signature
}
export interface ArchiveReceipt {
  archiveRef: string;
  archivedAt: string;
}
export interface ArchivingPort {
  archive(req: ArchiveRequest): Promise<ArchiveReceipt>;
  verify(archiveRef: string): Promise<{ intact: boolean; archivedAt: string }>;
}
