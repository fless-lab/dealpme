/**
 * Liste de contrôle Deal-Ready (P06). Une seule source de vérité, lue par l'entreprise qui prépare sa
 * demande et par l'officier CCI-Togo qui l'instruit : les deux voient les mêmes critères, dans le même ordre.
 *
 * Cette liste ne décide jamais. Elle dit ce qui est vérifiable et ce qui reste à produire ; la certification
 * demeure une décision nominative d'un officier, qui peut refuser un dossier pourtant complet.
 */
export type CriterionState = "SATISFIED" | "MISSING";

export interface DealReadyInput {
  /** Une vérification RCCM ou CFE est enregistrée pour l'entreprise. */
  registryVerified: boolean;
  /** L'adhésion de l'organisation détentrice a été confirmée par la CCI-Togo. */
  membershipConfirmed: boolean;
  /** Au moins un dossier de cette entreprise a été soumis à vérification. */
  dossierSubmitted: boolean;
  /** Rubriques de pièces déposées, toutes dossiers confondus, pour cette entreprise. */
  documentCategories: string[];
}

export interface DealReadyCriterion {
  key: string;
  label: string;
  /** Ce que la CCI-Togo vérifie sur ce point, en une phrase. */
  scope: string;
  state: CriterionState;
  /** Ce que l'entreprise doit produire quand le critère n'est pas satisfait. */
  remedy?: string;
  /** Un critère non bloquant n'empêche pas la demande, mais l'officier le voit. */
  blocking: boolean;
}

export interface DealReadyChecklist {
  criteria: DealReadyCriterion[];
  /** Vrai quand tous les critères bloquants sont satisfaits : la demande peut être déposée. */
  requestable: boolean;
  missingBlocking: number;
}

const REQUIRED_DOCUMENTS: { category: string; label: string; scope: string }[] = [
  { category: "STATUTS", label: "Statuts à jour", scope: "Existence de la société et de ses organes." },
  { category: "RCCM", label: "Extrait RCCM", scope: "Immatriculation au registre du commerce." },
  { category: "ETATS_FINANCIERS", label: "États financiers des trois derniers exercices", scope: "Présence des comptes, sans jugement sur leur exactitude." },
  { category: "ATTESTATION_FISCALE", label: "Attestation de régularité fiscale", scope: "Situation déclarée auprès de l'administration fiscale." },
];

/**
 * Portée du badge. Ce texte accompagne toujours le badge Deal-Ready, dans l'application comme dans
 * les exports : il dit ce qui est vérifié et, tout aussi important, ce qui ne l'est pas.
 */
export const DEAL_READY_SCOPE =
  "Existence juridique, immatriculation au RCCM et complétude documentaire vérifiées par la CCI-Togo. Ne portent ni sur l'exactitude des états financiers, ni sur l'absence de litige, ni sur la valeur de l'entreprise.";

export const DEAL_READY_LIMITS = [
  "La certification ne garantit pas l'exactitude des chiffres déclarés par le cédant.",
  "Elle ne constate ni l'absence de litige, ni l'absence de dette.",
  "Elle ne porte aucun jugement sur le prix ni sur la valeur de l'entreprise.",
  "Elle peut être retirée par la CCI-Togo, notamment si une pièce se révèle inexacte.",
];

export function dealReadyChecklist(input: DealReadyInput): DealReadyChecklist {
  const deposited = new Set(input.documentCategories);
  const criteria: DealReadyCriterion[] = [
    {
      key: "REGISTRY_VERIFIED",
      label: "Vérification au registre RCCM ou CFE",
      scope: "Un officier a consulté le registre et enregistré ce qu'il a lu, avec sa source.",
      state: input.registryVerified ? "SATISFIED" : "MISSING",
      blocking: true,
      ...(input.registryVerified ? {} : { remedy: "La vérification est faite par la CCI-Togo. Renseignez le numéro RCCM et déposez l'extrait pour qu'elle puisse être menée." }),
    },
    {
      key: "DOSSIER_SUBMITTED",
      label: "Dossier soumis à vérification",
      scope: "Le dossier de transmission est complet et a été transmis à la CCI-Togo.",
      state: input.dossierSubmitted ? "SATISFIED" : "MISSING",
      blocking: true,
      ...(input.dossierSubmitted ? {} : { remedy: "Complétez le dossier, puis soumettez-le depuis le récapitulatif." }),
    },
    ...REQUIRED_DOCUMENTS.map((d): DealReadyCriterion => ({
      key: `DOCUMENT_${d.category}`,
      label: d.label,
      scope: d.scope,
      state: deposited.has(d.category) ? "SATISFIED" : "MISSING",
      blocking: true,
      ...(deposited.has(d.category) ? {} : { remedy: `Déposez la pièce "${d.label}" dans l'étape Pièces du dossier.` }),
    })),
    {
      key: "MEMBERSHIP_CONFIRMED",
      label: "Adhésion CCI-Togo confirmée",
      scope: "L'appartenance à la chambre est enregistrée par sa référence de confirmation.",
      state: input.membershipConfirmed ? "SATISFIED" : "MISSING",
      blocking: false,
      ...(input.membershipConfirmed ? {} : { remedy: "L'adhésion n'est pas obligatoire pour demander la certification. Rapprochez-vous de la CCI-Togo si vous pensez être membre." }),
    },
  ];
  const missingBlocking = criteria.filter((c) => c.blocking && c.state === "MISSING").length;
  return { criteria, requestable: missingBlocking === 0, missingBlocking };
}
