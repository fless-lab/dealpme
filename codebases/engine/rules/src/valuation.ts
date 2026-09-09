import { xof, type Xof } from "@dealpme/domain";

/**
 * Évaluation financière sommaire et non opposable (P05, DP-MKT-019).
 * Produit une fourchette indicative avec méthode, hypothèses et sources affichées.
 * Ne doit JAMAIS être présentée comme un avis de valorisation de DealPME.
 */
export interface Restatement {
  label: string;
  amountXof: number;
  justification: string;
}

export interface ValuationInput {
  ebitdaXof: Xof;
  netDebtXof: number; // peut être négatif (trésorerie nette)
  restatements: Restatement[];
  /** Multiples sectoriels documentés ; la source et la date sont obligatoires. */
  multiples: { low: number; high: number; source: string; asOf: string };
}

export interface IndicativeRange {
  method: "EBITDA_MULTIPLE";
  adjustedEbitdaXof: Xof;
  equityValueLowXof: Xof;
  equityValueHighXof: Xof;
  assumptions: string[];
  sources: string[];
  disclaimer: string;
  computedAt: string;
  calculationLog: Record<string, number | string>;
}

export const VALUATION_DISCLAIMER =
  "Évaluation indicative et non opposable. Méthode et hypothèses affichées. Ne constitue pas un avis de valorisation de DealPME ; un expert indépendant peut être mandaté.";

export function indicativeRange(input: ValuationInput): IndicativeRange {
  if (input.multiples.low <= 0 || input.multiples.high < input.multiples.low) {
    throw new RangeError("Multiples invalides");
  }
  const adjustments = input.restatements.reduce((sum, r) => sum + r.amountXof, 0);
  const adjustedEbitda = Math.max(0, input.ebitdaXof + adjustments);
  const evLow = Math.floor(adjustedEbitda * input.multiples.low);
  const evHigh = Math.floor(adjustedEbitda * input.multiples.high);
  const eqLow = Math.max(0, evLow - input.netDebtXof);
  const eqHigh = Math.max(0, evHigh - input.netDebtXof);
  return {
    method: "EBITDA_MULTIPLE",
    adjustedEbitdaXof: xof(adjustedEbitda),
    equityValueLowXof: xof(eqLow),
    equityValueHighXof: xof(eqHigh),
    assumptions: [
      `EBITDA retraité = EBITDA déclaré ${input.ebitdaXof} + retraitements ${adjustments}`,
      `Multiples appliqués : ${input.multiples.low}x à ${input.multiples.high}x`,
      `Dette nette déduite : ${input.netDebtXof}`,
      ...input.restatements.map((r) => `Retraitement "${r.label}" : ${r.amountXof} (${r.justification})`),
    ],
    sources: [`${input.multiples.source} (au ${input.multiples.asOf})`],
    disclaimer: VALUATION_DISCLAIMER,
    computedAt: new Date().toISOString(),
    calculationLog: {
      ebitdaDeclared: input.ebitdaXof,
      restatementsTotal: adjustments,
      adjustedEbitda,
      multipleLow: input.multiples.low,
      multipleHigh: input.multiples.high,
      enterpriseValueLow: evLow,
      enterpriseValueHigh: evHigh,
      netDebt: input.netDebtXof,
      rulesVersion: "P05-2026-09",
    },
  };
}
