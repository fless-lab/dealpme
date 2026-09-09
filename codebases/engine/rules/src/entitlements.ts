import { SubscriptionTier, xof, type Xof } from "@dealpme/domain";

/**
 * Grille des paliers (v0, section 7.1.1). Une seule source, versionnée.
 * Prix mensuels en FCFA, prépayés. Aucun prélèvement récurrent.
 */
export const ENTITLEMENTS_VERSION = "2026-06-25";

export interface Entitlements {
  monthlyPriceXof: Xof;
  taxCompliance: "STANDARD_ALERTS" | "SIMPLIFIED_FILING" | "EXPERT_ASSISTANCE" | "UNLIMITED_MULTI_SITE";
  legalDocsPerMonth: number | "UNLIMITED";
  legalCounselReview: boolean;
  b2bNetworking: "VISITOR" | "STANDARD_EXHIBITOR" | "VIP_EXHIBITOR" | "PRINCIPAL_SPONSOR";
  rebound: "SELF_DIAGNOSTIC" | "ASSET_LISTING" | "CRISIS_UNIT" | "RESTRUCTURING_MANDATE";
  diaspora: "NONE" | "CONSULTATION_ONLY" | "INTRODUCTIONS_5_PER_MONTH" | "UNLIMITED_DATA_ROOM";
  dealReady: "NONE" | "AUDIT_INCLUDED" | "PRIORITY_WITH_VIDEO";
  passTransmission: "NONE" | "LISTING_ACCESS" | "EXCLUSIVE_MANDATE";
}

export const ENTITLEMENTS: Record<SubscriptionTier, Entitlements> = {
  STARTER: {
    monthlyPriceXof: xof(15_000),
    taxCompliance: "STANDARD_ALERTS",
    legalDocsPerMonth: 1,
    legalCounselReview: false,
    b2bNetworking: "VISITOR",
    rebound: "SELF_DIAGNOSTIC",
    diaspora: "NONE",
    dealReady: "NONE",
    passTransmission: "NONE",
  },
  BUSINESS: {
    monthlyPriceXof: xof(50_000),
    taxCompliance: "SIMPLIFIED_FILING",
    legalDocsPerMonth: 5,
    legalCounselReview: false,
    b2bNetworking: "STANDARD_EXHIBITOR",
    rebound: "ASSET_LISTING",
    diaspora: "CONSULTATION_ONLY",
    dealReady: "NONE",
    passTransmission: "NONE",
  },
  PREMIUM: {
    monthlyPriceXof: xof(150_000),
    taxCompliance: "EXPERT_ASSISTANCE",
    legalDocsPerMonth: "UNLIMITED",
    legalCounselReview: false,
    b2bNetworking: "VIP_EXHIBITOR",
    rebound: "CRISIS_UNIT",
    diaspora: "INTRODUCTIONS_5_PER_MONTH",
    dealReady: "AUDIT_INCLUDED",
    passTransmission: "LISTING_ACCESS",
  },
  ELITE: {
    monthlyPriceXof: xof(300_000),
    taxCompliance: "UNLIMITED_MULTI_SITE",
    legalDocsPerMonth: "UNLIMITED",
    legalCounselReview: true,
    b2bNetworking: "PRINCIPAL_SPONSOR",
    rebound: "RESTRUCTURING_MANDATE",
    diaspora: "UNLIMITED_DATA_ROOM",
    dealReady: "PRIORITY_WITH_VIDEO",
    passTransmission: "EXCLUSIVE_MANDATE",
  },
};

export function canListOnPassTransmission(tier: SubscriptionTier): boolean {
  return ENTITLEMENTS[tier].passTransmission !== "NONE";
}

export function legalDocQuota(tier: SubscriptionTier): number | "UNLIMITED" {
  return ENTITLEMENTS[tier].legalDocsPerMonth;
}
