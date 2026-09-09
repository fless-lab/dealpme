import { SubscriptionTier, applyRate, xof, type Xof } from "@dealpme/domain";

/**
 * Barème de frais de succès (v0, section 7). Gouverné par le drapeau FEATURE_TRANSACTION_FEES :
 * il ne s'active qu'après un avis juridique écrit archivé (DP-RPS-021). Répartition 70/30 plateforme/institution.
 * Minimum garanti : 1 500 000 FCFA au palier Premium.
 */
interface Bracket {
  upToXof: number; // borne haute incluse, Infinity pour la dernière tranche
  premiumRate: number;
  eliteRate: number;
}

export const FEE_BRACKETS: readonly Bracket[] = [
  { upToXof: 50_000_000, premiumRate: 8, eliteRate: 6 },
  { upToXof: 250_000_000, premiumRate: 6, eliteRate: 5 },
  { upToXof: 1_000_000_000, premiumRate: 5, eliteRate: 4 },
  { upToXof: Number.POSITIVE_INFINITY, premiumRate: 4, eliteRate: 3 },
];

export const MINIMUM_FEE_PREMIUM_XOF = xof(1_500_000);
export const PLATFORM_SHARE_PERCENT = 70;

export interface FeeComputation {
  basisXof: Xof;
  ratePercent: number;
  rawFeeXof: Xof;
  minimumApplied: boolean;
  feeXof: Xof;
  platformShareXof: Xof;
  institutionShareXof: Xof;
  version: string;
}

export function computeSuccessFee(basis: Xof, tier: SubscriptionTier): FeeComputation {
  if (tier !== SubscriptionTier.PREMIUM && tier !== SubscriptionTier.ELITE) {
    throw new Error("Les frais de succès ne s'appliquent qu'aux paliers Premium et Elite");
  }
  const bracket = FEE_BRACKETS.find((b) => basis <= b.upToXof) ?? FEE_BRACKETS[FEE_BRACKETS.length - 1]!;
  const rate = tier === SubscriptionTier.PREMIUM ? bracket.premiumRate : bracket.eliteRate;
  const raw = applyRate(basis, rate);
  const minimumApplied = tier === SubscriptionTier.PREMIUM && raw < MINIMUM_FEE_PREMIUM_XOF;
  const fee = minimumApplied ? MINIMUM_FEE_PREMIUM_XOF : raw;
  const platform = applyRate(fee, PLATFORM_SHARE_PERCENT);
  return {
    basisXof: basis,
    ratePercent: rate,
    rawFeeXof: raw,
    minimumApplied,
    feeXof: fee,
    platformShareXof: platform,
    institutionShareXof: xof(fee - platform),
    version: "FEES-2026-06-25",
  };
}

/** Répartition des revenus par catégorie (plateforme / CCI-Togo), en pourcentage plateforme. */
export const REVENUE_SHARE_PLATFORM_PERCENT = {
  SAAS_SUBSCRIPTION: 90,
  B2B_EVENTS: 90,
  CERTIFICATION: 50,
  TRANSMISSION_SUCCESS_FEE: 70,
  DISTRESSED_DISPOSAL_FEE: 70,
} as const;
