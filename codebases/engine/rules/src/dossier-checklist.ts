import { DealType } from "@dealpme/domain";

/**
 * Liste des pièces et des informations attendues pour qu'un dossier cédant soit soumis à vérification (P04).
 * Une seule source de vérité, partagée par l'assistant du cédant et par la liste de contrôle Deal-Ready
 * de la CCI-Togo : les deux écrans ne peuvent pas diverger.
 *
 * La règle de branchement est celle du v0 : le type de cession est choisi à l'étape 1 et détermine les
 * pièces attendues. Une cession de titres exige les pièces qui portent le risque de nullité (capital,
 * clauses d'agrément), qu'une cession d'actifs n'a pas.
 */
export type DossierStep = "IDENTITE" | "ACTIVITE" | "FINANCES" | "PIECES" | "CESSION";

export interface FactRequirement {
  kind: "fact";
  key: string;
  label: string;
  step: DossierStep;
  /** Montant entier en XOF plutôt que texte libre. */
  amount?: boolean;
  /** Exercice concerné, quand la valeur est annuelle. */
  periodic?: boolean;
  help?: string;
}

export interface DocumentRequirement {
  kind: "document";
  category: string;
  label: string;
  step: DossierStep;
  help?: string;
}

export type Requirement = FactRequirement | DocumentRequirement;

const COMMON: Requirement[] = [
  { kind: "fact", key: "ACTIVITY_DESCRIPTION", label: "Description de l'activité", step: "ACTIVITE", help: "Ce que fait l'entreprise, en quelques lignes. Ce texte n'est pas publié tel quel." },
  { kind: "fact", key: "EMPLOYEE_COUNT", label: "Effectif", step: "ACTIVITE" },
  { kind: "fact", key: "TRANSFER_REASON", label: "Motif de la transmission", step: "CESSION", help: "Départ à la retraite, réorientation, difficulté : l'information reste interne." },
  { kind: "fact", key: "TURNOVER", label: "Chiffre d'affaires", step: "FINANCES", amount: true, periodic: true },
  { kind: "fact", key: "EBITDA", label: "Excédent brut d'exploitation", step: "FINANCES", amount: true, periodic: true, help: "Après retraitements, dont la justification est enregistrée avec la valeur." },
  { kind: "fact", key: "NET_DEBT", label: "Dette nette", step: "FINANCES", amount: true, periodic: true },
  { kind: "document", category: "STATUTS", label: "Statuts à jour", step: "PIECES" },
  { kind: "document", category: "RCCM", label: "Extrait RCCM", step: "PIECES", help: "La CCI-Togo vérifie ensuite l'inscription auprès du registre." },
  { kind: "document", category: "ETATS_FINANCIERS", label: "États financiers des trois derniers exercices", step: "PIECES", help: "Déclarés, non audités par DealPME." },
  { kind: "document", category: "ATTESTATION_FISCALE", label: "Attestation de régularité fiscale", step: "PIECES" },
];

const ASSET_ONLY: Requirement[] = [
  { kind: "fact", key: "ASSETS_DESCRIPTION", label: "Actifs cédés", step: "CESSION", help: "Fonds de commerce, matériel, stocks, contrats : ce qui change de mains." },
  { kind: "fact", key: "INCLUDES_GOODWILL", label: "La cession inclut-elle le fonds de commerce", step: "CESSION" },
  { kind: "document", category: "INVENTAIRE_ACTIFS", label: "Inventaire des actifs cédés", step: "PIECES" },
];

const SHARE_ONLY: Requirement[] = [
  { kind: "fact", key: "SECURITY_TYPE", label: "Nature des titres", step: "CESSION", help: "Actions ou parts sociales : la forme juridique commande le régime de divulgation." },
  { kind: "fact", key: "STAKE_PERCENT", label: "Pourcentage du capital cédé", step: "CESSION" },
  { kind: "fact", key: "TRANSFER_RESTRICTIONS", label: "Clauses d'agrément et de préemption", step: "CESSION", help: "Ces clauses conditionnent la validité de la cession." },
  { kind: "document", category: "REGISTRE_TITRES", label: "Registre des titres ou des parts", step: "PIECES" },
  { kind: "document", category: "PACTE_ASSOCIES", label: "Pacte d'associés, s'il existe", step: "PIECES" },
];

export function requirementsFor(dealType: DealType): Requirement[] {
  return [...COMMON, ...(dealType === DealType.SHARE_DEAL ? SHARE_ONLY : ASSET_ONLY)];
}

export interface CompletenessInput {
  dealType: DealType;
  /** Clés des valeurs déclarées en vigueur (versions courantes). */
  factKeys: string[];
  /** Rubriques pour lesquelles au moins une pièce propre est déposée. */
  documentCategories: string[];
}

export interface Missing {
  kind: "fact" | "document";
  key: string;
  label: string;
  step: DossierStep;
}

export interface Completeness {
  complete: boolean;
  /** Part des exigences satisfaites, entre 0 et 1. Sert d'indicateur, jamais de décision. */
  ratio: number;
  missing: Missing[];
}

/**
 * Complétude du dossier. Elle conditionne la soumission à vérification : un dossier incomplet reste en DRAFT.
 * Elle ne décide jamais de la certification Deal-Ready, qui reste une décision nominative de la CCI-Togo.
 */
export function completeness(input: CompletenessInput): Completeness {
  const required = requirementsFor(input.dealType);
  const facts = new Set(input.factKeys);
  const docs = new Set(input.documentCategories);
  const missing: Missing[] = [];
  for (const r of required) {
    if (r.kind === "fact" && !facts.has(r.key)) missing.push({ kind: "fact", key: r.key, label: r.label, step: r.step });
    if (r.kind === "document" && !docs.has(r.category)) missing.push({ kind: "document", key: r.category, label: r.label, step: r.step });
  }
  const satisfied = required.length - missing.length;
  return { complete: missing.length === 0, ratio: required.length === 0 ? 1 : satisfied / required.length, missing };
}
