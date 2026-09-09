import type { DealType, RegionCode, TurnoverBand } from "@dealpme/domain";

/** Projection T0 d'un deal : les seuls champs que le matching a le droit de lire. */
export interface DealTeaserT0Like {
  id: string;
  dealType: DealType;
  sectorCode: string;
  regionCode: RegionCode;
  turnoverBand: TurnoverBand;
  isDealReady: boolean;
}

/** Thèse d'acquisition déclarée par un investisseur qualifié (P08). Listes vides = pas de contrainte. */
export interface InvestorThesis {
  sectorCodes: string[];
  regionCodes: RegionCode[];
  turnoverBands: TurnoverBand[];
  dealTypes: DealType[];
  dealReadyOnly: boolean;
}
