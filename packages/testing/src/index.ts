import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { DealType, RegionCode, TurnoverBand, newId, xof, type Deal, DealStatus, DealVisibility } from "@dealpme/domain";

/**
 * Le corpus de référence (Master Developer Handoff V3.1) est l'oracle de test :
 * fixtures PT-001 à PT-012, 24 scénarios de service, registres de contrats d'interaction.
 * Il n'est pas copié dans le dépôt : on pointe vers `ressources/` et on échoue clairement s'il est absent.
 */
export const CORPUS_ROOT = resolve(
  process.env["DEALPME_CORPUS_ROOT"] ??
    join(
      __dirname,
      "../../../ressources/DEALPME-20260909T190445Z-1-001/DEALPME/DealPME_V_MASTER_DEVELOPER_HANDOFF/DealPME__MASTER_DEVELOPER_HANDOFF/04_EXECUTABLE_REFERENCE/DealPME_V3_Release",
    ),
);

export const SYNTHETIC_LABEL = "DÉMO SYNTHÉTIQUE · DONNÉES FICTIVES · AUCUNE ENTREPRISE RÉELLE";

export function corpusAvailable(): boolean {
  return existsSync(CORPUS_ROOT);
}

/** Charge le fichier `data/fixture.v3.json` d'un cas Pass Transmission (PT-001 par défaut, le cas d'or). */
export function loadPassTransmissionFixture<T = unknown>(caseId = "PT-001"): T {
  const file = join(CORPUS_ROOT, "pass-transmission", caseId, "data", "fixture.v3.json");
  if (!existsSync(file)) {
    throw new Error(`Fixture introuvable : ${file}. Définir DEALPME_CORPUS_ROOT ou restaurer le dossier ressources/.`);
  }
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

/** Charge un fichier de données quelconque d'un cas (risks.json, q-and-a.json, access-matrix.json, interaction-contract.json...). */
export function loadCaseData<T = unknown>(caseId: string, fileName: string): T {
  const file = join(CORPUS_ROOT, "pass-transmission", caseId, "data", fileName);
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

/** Constructeur d'un deal synthétique pour les tests unitaires (aucune donnée réelle). */
export function buildDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: newId(),
    companyId: newId(),
    sellerOrganisationId: newId(),
    dealType: DealType.ASSET_DEAL,
    status: DealStatus.DRAFT,
    visibility: DealVisibility.DRAFT,
    sectorCode: "AGRO",
    regionCode: RegionCode.GRAND_LOME,
    turnoverBand: TurnoverBand.FROM_250M_TO_1B,
    askingPrice: xof(850_000_000),
    valuationBasis: "Multiple d'EBITDA sectoriel, source : comparables synthétiques PT-001",
    disclosureCount: 0,
    circleCap: 50,
    createdAt: new Date("2026-09-09T00:00:00Z"),
    ...overrides,
  };
}
