/** Référentiel partagé par les écrans du dossier cédant. Les libellés viennent de l'API (@dealpme/rules). */

export type DossierStep = "IDENTITE" | "ACTIVITE" | "FINANCES" | "PIECES" | "CESSION";

export const STEPS: { id: DossierStep; slug: string; label: string; help: string }[] = [
  { id: "IDENTITE", slug: "identite", label: "Identité", help: "L'entreprise et le type de cession, fixés à la création." },
  { id: "ACTIVITE", slug: "activite", label: "Activité", help: "Ce que fait l'entreprise et avec combien de personnes." },
  { id: "FINANCES", slug: "finances", label: "Finances", help: "Chiffres déclarés, avec leur exercice et la justification des retraitements." },
  { id: "CESSION", slug: "cession", label: "Cession", help: "Ce qui change de mains et à quelles conditions." },
  { id: "PIECES", slug: "pieces", label: "Pièces", help: "Documents justificatifs. Chaque fichier est analysé avant enregistrement." },
];

export const STEP_BY_SLUG = new Map(STEPS.map((s) => [s.slug, s]));

export interface Requirement {
  kind: "fact" | "document";
  key?: string;
  category?: string;
  label: string;
  step: DossierStep;
  amount?: boolean;
  periodic?: boolean;
  help?: string;
}

export interface DeclaredFact {
  id: string;
  fieldKey: string;
  periodLabel: string | null;
  valueText: string | null;
  valueAmountXof: number | null;
  source: string;
  note: string | null;
  version: number;
  declaredAt: string;
}

export interface DossierDocument {
  id: string;
  category: string;
  title: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  version: number;
  scanState: string;
  scanEngine: string;
  uploadedAt: string;
}

export interface Dossier {
  dealId: string;
  dealType: "ASSET_DEAL" | "SHARE_DEAL";
  status: string;
  lastReturn: { reason: string | null; occurredAt: string } | null;
  requirements: Requirement[];
  facts: DeclaredFact[];
  documents: DossierDocument[];
  completeness: { complete: boolean; ratio: number; missing: { kind: string; key: string; label: string; step: DossierStep }[] };
}

export const SOURCE_LABEL: Record<string, string> = {
  SELLER_DECLARATION: "Déclaré par le cédant",
  SUPPORTING_DOCUMENT: "Appuyé par une pièce",
  REGISTRY: "Registre RCCM / CFE",
  EXPERT_REVIEW: "Revu par un expert",
};

export const DEAL_STATUS_LABEL: Record<string, string> = {
  DRAFT: "En préparation",
  PENDING_VERIFICATION: "Soumis à vérification",
  VERIFIED: "Vérifié",
  LISTED_OPEN: "Publié",
  LISTED_RESTRICTED: "Publié en cercle restreint",
  ENGAGED: "Mise en relation engagée",
  DUE_DILIGENCE: "Audit d'acquisition",
  NEGOTIATION: "Négociation",
  CLOSED_REPORTED: "Transmission déclarée",
  ABANDONED: "Abandonné",
};

export const BAND_LABEL: Record<string, string> = {
  LT_50M: "moins de 50 M FCFA",
  FROM_50M_TO_250M: "50 à 250 M FCFA",
  FROM_250M_TO_1B: "250 M à 1 Md FCFA",
  GT_1B: "plus de 1 Md FCFA",
};

export const REGION_LABEL: Record<string, string> = {
  GRAND_LOME: "Grand Lomé",
  MARITIME: "Maritime",
  PLATEAUX: "Plateaux",
  CENTRALE: "Centrale",
  KARA: "Kara",
  SAVANES: "Savanes",
};

export const SECTORS: { code: string; label: string }[] = [
  { code: "AGRO", label: "Agroalimentaire" },
  { code: "MANUF", label: "Industrie et fabrication" },
  { code: "LOGI", label: "Transport et logistique" },
  { code: "BTP", label: "Bâtiment et travaux publics" },
  { code: "COMM", label: "Commerce et distribution" },
  { code: "SERV", label: "Services aux entreprises" },
  { code: "SANTE", label: "Santé" },
  { code: "EDUC", label: "Éducation et formation" },
  { code: "TECH", label: "Technologies et numérique" },
  { code: "TOUR", label: "Hôtellerie et tourisme" },
];

/** Montants en FCFA entiers, sans décimale (convention v0). */
export function fmtXof(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${value.toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA`;
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
