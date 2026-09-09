import { DealType, DisclosureTier } from "@dealpme/domain";

/**
 * Règles du cercle de divulgation (v0, section 3.4). Fonctions pures, testées sans base.
 * Le compteur compte des personnes distinctes ; les personnes d'un même groupe lié comptent pour une.
 */
export interface DisclosureLike {
  personId: string;
  relatedPersonGroupId: string | null;
  tier: DisclosureTier;
  revokedAt: Date | null;
}

export function countDisclosedPersons(disclosures: DisclosureLike[]): number {
  const keys = new Set<string>();
  for (const d of disclosures) {
    if (d.revokedAt) continue;
    if (d.tier === DisclosureTier.T0) continue; // T0 = existence seulement, pas une "information suffisante"
    keys.add(d.relatedPersonGroupId ? `g:${d.relatedPersonGroupId}` : `p:${d.personId}`);
  }
  return keys.size;
}

export type CircleMode = "AUTOMATIC_BLOCKED" | "MANUAL_ADMISSION" | "FULL";

export interface CircleStatus {
  count: number;
  cap: number;
  remaining: number;
  usageRatio: number;
  mode: CircleMode;
}

/**
 * Jusqu'à 80 % du plafond : admission humaine standard. De 80 % à 100 % : admission manuelle renforcée (alerte).
 * À 100 % : blocage tant qu'une personne n'est pas retirée (avec motif). Dans tous les cas la décision est humaine.
 */
export function circleStatus(disclosures: DisclosureLike[], cap: number): CircleStatus {
  const count = countDisclosedPersons(disclosures);
  const ratio = cap === 0 ? 1 : count / cap;
  const mode: CircleMode = count >= cap ? "FULL" : ratio >= 0.8 ? "MANUAL_ADMISSION" : "AUTOMATIC_BLOCKED";
  return { count, cap, remaining: Math.max(0, cap - count), usageRatio: ratio, mode };
}

export interface PublicationRequest {
  dealType: DealType;
  requestedTier: DisclosureTier;
  audience: "OPEN_SURFACE" | "AUTHENTICATED" | "ADMITTED_CIRCLE" | "NAMED_INVITATION";
}

export type PublicationDecision = { allowed: true } | { allowed: false; code: "PERIMETER_BLOCKED"; reason: string };

/** Décision de publication : une cession de titres n'est jamais exposée au-delà de T0 hors cercle admis. */
export function decidePublication(req: PublicationRequest): PublicationDecision {
  if (req.dealType === DealType.ASSET_DEAL) {
    if (req.requestedTier === DisclosureTier.T2 && req.audience !== "ADMITTED_CIRCLE" && req.audience !== "NAMED_INVITATION") {
      return { allowed: false, code: "PERIMETER_BLOCKED", reason: "Le palier T2 exige un NDA exécuté, même pour une cession d'actifs" };
    }
    return { allowed: true };
  }
  // SHARE_DEAL
  if (req.audience === "OPEN_SURFACE") {
    return { allowed: false, code: "PERIMETER_BLOCKED", reason: "Une cession de titres ne peut pas être publiée sur une surface ouverte : risque de nullité (appel public à l'épargne)" };
  }
  if (req.requestedTier !== DisclosureTier.T0 && req.audience === "AUTHENTICATED") {
    return { allowed: false, code: "PERIMETER_BLOCKED", reason: "Au-delà de T0, une cession de titres exige une admission humaine au cercle" };
  }
  return { allowed: true };
}

export type CommunicationDecision = "PERMIT" | "REDACT" | "BLOCK";

/** Filtre de communication sortante : tout message sur une cession de titres passe ici. */
export function decideCommunication(dealType: DealType, recipientTier: DisclosureTier, containsSensitiveTerms: boolean): CommunicationDecision {
  if (dealType === DealType.ASSET_DEAL) return "PERMIT";
  if (recipientTier === DisclosureTier.T2) return "PERMIT";
  if (recipientTier === DisclosureTier.T1) return containsSensitiveTerms ? "REDACT" : "PERMIT";
  return containsSensitiveTerms ? "BLOCK" : "PERMIT";
}
