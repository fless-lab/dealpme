import { DealStatus, DealType } from "@dealpme/domain";

/**
 * Machine à états du deal (v0, section 6.1).
 * Toute transition invalide doit produire une erreur INVALID_TRANSITION (HTTP 409) et
 * chaque transition valide doit écrire un DealEvent. L'entrée en CLOSED_REPORTED crée un FeeEvent.
 */
const TRANSITIONS: Record<DealStatus, readonly DealStatus[]> = {
  DRAFT: [DealStatus.PENDING_VERIFICATION, DealStatus.ABANDONED],
  PENDING_VERIFICATION: [DealStatus.VERIFIED, DealStatus.DRAFT, DealStatus.ABANDONED],
  VERIFIED: [DealStatus.LISTED_OPEN, DealStatus.LISTED_RESTRICTED, DealStatus.ABANDONED],
  LISTED_OPEN: [DealStatus.ENGAGED, DealStatus.ABANDONED],
  LISTED_RESTRICTED: [DealStatus.ENGAGED, DealStatus.ABANDONED],
  ENGAGED: [DealStatus.DUE_DILIGENCE, DealStatus.ABANDONED],
  DUE_DILIGENCE: [DealStatus.NEGOTIATION, DealStatus.ENGAGED, DealStatus.ABANDONED],
  NEGOTIATION: [DealStatus.CLOSED_REPORTED, DealStatus.HANDED_OFF, DealStatus.DUE_DILIGENCE, DealStatus.ABANDONED],
  CLOSED_REPORTED: [],
  HANDED_OFF: [],
  ABANDONED: [],
};

export const TERMINAL_STATUSES: readonly DealStatus[] = [DealStatus.CLOSED_REPORTED, DealStatus.HANDED_OFF, DealStatus.ABANDONED];

export interface TransitionContext {
  dealType: DealType;
  /** Le passage en LISTED_RESTRICTED exige l'autorisation du RPS ; le passage en LISTED_OPEN est interdit aux cessions de titres. */
  rpsPublicationAuthorized?: boolean;
  /** HANDED_OFF n'est atteignable que si le drapeau partenaire habilité est actif (DP-RPS-020/021). */
  licensedPartnerHandoffEnabled?: boolean;
}

export type TransitionResult =
  | { ok: true; to: DealStatus; createsFeeEvent: boolean }
  | { ok: false; reason: string };

export function canTransition(from: DealStatus, to: DealStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transition(from: DealStatus, to: DealStatus, ctx: TransitionContext): TransitionResult {
  if (!canTransition(from, to)) {
    return { ok: false, reason: `Transition ${from} -> ${to} non autorisée` };
  }
  if (to === DealStatus.LISTED_OPEN && ctx.dealType === DealType.SHARE_DEAL) {
    return { ok: false, reason: "Une cession de titres ne peut pas être publiée en surface ouverte (périmètre réglementaire)" };
  }
  if (to === DealStatus.LISTED_RESTRICTED && ctx.rpsPublicationAuthorized !== true) {
    return { ok: false, reason: "Publication en cercle restreint non autorisée par le RPS" };
  }
  if (to === DealStatus.HANDED_OFF && ctx.licensedPartnerHandoffEnabled !== true) {
    return { ok: false, reason: "Le transfert à un partenaire habilité est désactivé (avis juridique requis)" };
  }
  return { ok: true, to, createsFeeEvent: to === DealStatus.CLOSED_REPORTED };
}

export function allowedTransitions(from: DealStatus): readonly DealStatus[] {
  return TRANSITIONS[from];
}
