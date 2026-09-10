/**
 * Analyse antivirus des pièces déposées. Ce fichier est le contrat : l'API ne dépend que de ce port,
 * jamais d'un vendeur. Règle de sécurité : le verdict précède la mise à disposition. Un fichier sans
 * verdict propre n'est jamais lisible, ni par le déposant, ni par un tiers.
 */
export type ScanVerdict =
  | { clean: true }
  /** signature : nom de la menace tel que renvoyé par le moteur, conservé pour l'audit. */
  | { clean: false; signature: string };

export interface AntivirusPort {
  readonly engine: string;
  scan(bytes: Uint8Array): Promise<ScanVerdict>;
}
