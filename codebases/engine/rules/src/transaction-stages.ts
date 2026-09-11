/**
 * Progression canonique d'une transaction (standard d'implémentation v3, section 5).
 * Une seule liste, partagée par tous les écrans : le rail de la fiche d'opportunité, celui de l'espace
 * cédant et celui de la data room affichaient jusqu'ici des variantes, ce qui donnait trois vérités.
 *
 * Règle du corpus : aucun stade ne peut être sauté sans règle documentée. Les stades qui n'existent pas
 * encore dans le produit sont présents ici et signalés par `depuis`, pour que le parcours reste lisible
 * de bout en bout au lieu de s'arrêter là où le développement s'est arrêté.
 */
export type TransactionStageId =
  | "INTERESTED"
  | "QUALIFIED"
  | "ADMITTED"
  | "NDA"
  | "T2"
  | "VDR"
  | "LOI"
  | "CONFIRMATORY_AUDIT"
  | "DOCUMENTATION"
  | "OUTCOME";

export interface TransactionStage {
  id: TransactionStageId;
  label: string;
  /** Ce que le stade ouvre, en une phrase, pour la lentille de permission. */
  ouvre: string;
  /** Version du produit qui rend le stade praticable. */
  depuis: "V1" | "V2" | "V3";
}

export const TRANSACTION_STAGES: readonly TransactionStage[] = [
  { id: "INTERESTED", label: "Intérêt", ouvre: "Le repreneur se fait connaître du cédant, sans lui être identifié.", depuis: "V1" },
  { id: "QUALIFIED", label: "Qualification", ouvre: "Le cédant retient le repreneur comme interlocuteur sérieux.", depuis: "V2" },
  { id: "ADMITTED", label: "Admission", ouvre: "Pour une cession de titres, l'entrée au cercle restreint, prononcée par la conformité.", depuis: "V2" },
  { id: "NDA", label: "NDA", ouvre: "L'accord de confidentialité signé électroniquement engage les deux parties.", depuis: "V2" },
  { id: "T2", label: "Détail complet", ouvre: "L'identité de l'entreprise, le prix attendu et les conditions.", depuis: "V2" },
  { id: "VDR", label: "Data room", ouvre: "Les pièces, sous rendu serveur, filigrane et révocation.", depuis: "V2" },
  { id: "LOI", label: "Lettre d'intention", ouvre: "Une offre écrite, non engageante, qui fixe le cadre de la négociation.", depuis: "V3" },
  { id: "CONFIRMATORY_AUDIT", label: "Audit confirmatoire", ouvre: "La vérification des éléments sur lesquels l'offre repose.", depuis: "V3" },
  { id: "DOCUMENTATION", label: "Documentation", ouvre: "Les actes de cession et leurs annexes.", depuis: "V3" },
  { id: "OUTCOME", label: "Résultat", ouvre: "La transmission déclarée, ou l'abandon motivé.", depuis: "V3" },
] as const;

export const STAGE_BY_ID = new Map(TRANSACTION_STAGES.map((s) => [s.id, s]));

/** Index d'un stade dans la progression : sert à savoir ce qui est franchi et ce qui reste. */
export function stageIndex(id: TransactionStageId): number {
  return TRANSACTION_STAGES.findIndex((s) => s.id === id);
}

/** Stades disponibles dans une version donnée. Les autres restent affichés, mais jamais atteignables. */
export function stagesAvailableIn(version: "V1" | "V2" | "V3"): TransactionStage[] {
  const rang = { V1: 1, V2: 2, V3: 3 } as const;
  return TRANSACTION_STAGES.filter((s) => rang[s.depuis] <= rang[version]);
}
