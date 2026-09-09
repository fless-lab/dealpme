import { DealType, DisclosureTier } from "@dealpme/domain";

/**
 * Allow-list serveur des champs sérialisables par palier (v0, sections 3.3 et 3.4).
 * Le prix, la valorisation et les conditions d'offre ne sont JAMAIS rendus sous T2.
 * Cette liste est la seule autorité : le frontend ne fait pas de rendu conditionnel de sécurité.
 */
const T0_FIELDS = ["id", "dealType", "sectorCode", "regionCode", "turnoverBand", "isDealReady", "disclosureTier"] as const;

const T1_FIELDS = [
  ...T0_FIELDS,
  "anonymisedSummary",
  "employeesBand",
  "yearsInOperation",
  "financialProfileBands",
  "transferRestrictionsPresent",
] as const;

const T2_FIELDS = [
  ...T1_FIELDS,
  "companyLegalName",
  "rccmNumber",
  "askingPrice",
  "valuationBasis",
  "stakePercent",
  "securityType",
  "transferRestrictions",
  "offerTerms",
  "dataRoomId",
] as const;

export const ALLOWLIST: Record<DisclosureTier, readonly string[]> = {
  T0: T0_FIELDS,
  T1: T1_FIELDS,
  T2: T2_FIELDS,
};

/** Champs interdits sous T2 quel que soit le contexte (test négatif obligatoire : DISCLOSURE_LEAK). */
export const NEVER_BELOW_T2 = ["askingPrice", "valuationBasis", "offerTerms", "companyLegalName", "rccmNumber", "dataRoomId", "stakePercent"] as const;

export function projectForTier<T extends Record<string, unknown>>(record: T, tier: DisclosureTier): Partial<T> {
  const allowed = new Set(ALLOWLIST[tier]);
  const out: Partial<T> = {};
  for (const key of Object.keys(record) as (keyof T)[]) {
    if (allowed.has(String(key))) {
      out[key] = record[key];
    }
  }
  return out;
}

/**
 * Une cession de titres n'est jamais indexable ni exposée au-delà de T1 à un utilisateur non admis.
 * Une cession d'actifs peut être exposée en T0 à tout compte authentifié.
 */
export function maxTierWithoutAdmission(dealType: DealType): DisclosureTier {
  return dealType === DealType.SHARE_DEAL ? DisclosureTier.T0 : DisclosureTier.T1;
}

export function isIndexable(dealType: DealType, tier: DisclosureTier): boolean {
  if (dealType === DealType.SHARE_DEAL) {
    return false;
  }
  return tier === DisclosureTier.T0;
}
