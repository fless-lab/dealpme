import type { DealTeaserT0Like, InvestorThesis } from "./matching.types.js";

/**
 * Matching par règles, explicable (DP-MKT-015). Aucun modèle d'apprentissage en v0 :
 * "une recommandation inexplicable qui s'avère être une sollicitation est indéfendable".
 * Chaque correspondance porte une justification lisible par un humain.
 */
export interface MatchResult {
  dealId: string;
  score: number; // 0 à 100
  reasons: string[]; // justification lisible, toujours non vide si score > 0
}

export function matchDeal(deal: DealTeaserT0Like, thesis: InvestorThesis): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  if (thesis.sectorCodes.length === 0 || thesis.sectorCodes.includes(deal.sectorCode)) {
    score += 40;
    reasons.push(thesis.sectorCodes.length === 0 ? "Tous secteurs acceptés" : `Secteur recherché : ${deal.sectorCode}`);
  }
  if (thesis.regionCodes.length === 0 || thesis.regionCodes.includes(deal.regionCode)) {
    score += 25;
    reasons.push(thesis.regionCodes.length === 0 ? "Toutes régions acceptées" : `Région recherchée : ${deal.regionCode}`);
  }
  if (thesis.turnoverBands.length === 0 || thesis.turnoverBands.includes(deal.turnoverBand)) {
    score += 25;
    reasons.push(`Tranche de chiffre d'affaires compatible : ${deal.turnoverBand}`);
  }
  if (thesis.dealTypes.includes(deal.dealType)) {
    score += 10;
    reasons.push(`Type de cession accepté : ${deal.dealType}`);
  } else {
    // Un type refusé annule la correspondance : on ne propose jamais une cession de titres à qui ne l'a pas demandée.
    return { dealId: deal.id, score: 0, reasons: [] };
  }
  if (thesis.dealReadyOnly && !deal.isDealReady) {
    return { dealId: deal.id, score: 0, reasons: [] };
  }
  if (deal.isDealReady) {
    reasons.push("Certification Deal-Ready CCI-Togo présente");
  }
  return { dealId: deal.id, score: Math.min(100, score), reasons };
}

/** Seuil d'alerte : au-delà, une notification peut être proposée (opt-in strict, jamais de prix pour une cession de titres). */
export const MATCH_ALERT_THRESHOLD = 85;

export function rankMatches(deals: DealTeaserT0Like[], thesis: InvestorThesis): MatchResult[] {
  return deals
    .map((d) => matchDeal(d, thesis))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}
