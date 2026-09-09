/**
 * Règles de localisation (v0, section 12). Le français est la langue source.
 * Espace fine insécable avant ; : ! ? et pour le groupement des milliers ; symbole après le montant ; pas de décimale en FCFA.
 */
const NARROW_NBSP = " ";
const NBSP = " ";

/** 1500000 -> "1 500 000 FCFA" (espaces fines insécables). */
export function formatXof(amount: number): string {
  if (!Number.isInteger(amount)) {
    throw new RangeError("Un montant FCFA est un entier");
  }
  const sign = amount < 0 ? "-" : "";
  const digits = Math.abs(amount).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);
  return `${sign}${grouped}${NBSP}FCFA`;
}

/** Dates d'interface : JJ/MM/AAAA. Les API et exports utilisent ISO 8601. */
export function formatDateFr(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

/** Pourcentage : "12,5 %" avec virgule décimale et espace insécable avant le symbole. */
export function formatPercentFr(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace(".", ",")}${NARROW_NBSP}%`;
}

/**
 * Termes de l'art OHADA qui ne doivent jamais être traduits, dans aucune langue d'interface.
 * Liste utilisée par le contrôle de contenu (porte G7) et par les traducteurs.
 */
export const OHADA_TERMS_NEVER_TRANSLATED = [
  "appel public à l'épargne",
  "fonds de commerce",
  "parts sociales",
  "clause d'agrément",
  "règlement préventif",
  "conciliation",
  "mandataire de justice",
  "RCCM",
  "SYSCOHADA",
] as const;

/** Messages français source. Les clés sont stables ; l'anglais est dérivé de ce fichier. */
export const fr = {
  common: {
    syntheticDataBanner: "Démonstration à données synthétiques. Aucune entreprise réelle.",
    declaredUnaudited: "Données déclarées par le cédant, non auditées.",
    indicativeNotBinding: "Évaluation indicative, non opposable. Ne constitue pas un avis de valorisation de DealPME.",
    draftingAidNotAdvice: "Aide à la rédaction. Ne constitue pas un conseil juridique.",
  },
  errors: {
    PERIMETER_BLOCKED: "Publication bloquée par le périmètre réglementaire. Une cession de titres ne peut pas être diffusée au-delà du cercle autorisé.",
    INVALID_TRANSITION: "Transition impossible dans l'état actuel du dossier.",
    UNAUTHENTICATED: "Connexion requise.",
    FORBIDDEN: "Action non autorisée.",
    NOT_FOUND: "Ressource introuvable.",
  },
  dealStatus: {
    DRAFT: "Brouillon",
    PENDING_VERIFICATION: "En attente de vérification",
    VERIFIED: "Vérifié",
    LISTED_OPEN: "Publié",
    LISTED_RESTRICTED: "Publié en cercle restreint",
    ENGAGED: "Mise en relation engagée",
    DUE_DILIGENCE: "Audit d'acquisition",
    NEGOTIATION: "Négociation",
    CLOSED_REPORTED: "Réalisation déclarée par les parties",
    HANDED_OFF: "Transmis à un partenaire habilité",
    ABANDONED: "Abandonné",
  },
  vdrGate: {
    LOGIN_REQUIRED: "Connexion requise.",
    QUALIFICATION_REQUIRED: "Qualification requise avant l'accès.",
    ADMISSION_REQUIRED: "Admission au cercle requise. Décision humaine en attente.",
    NDA_REQUIRED: "Accord de confidentialité (NDA) à signer.",
    T2_GRANT_REQUIRED: "Autorisation T2 du cédant en attente.",
    VDR_HOME: "Data room",
    ACCESS_REVOKED: "Accès révoqué.",
  },
} as const;

export type Messages = typeof fr;
