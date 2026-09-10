import { describe, expect, it } from "vitest";
import { DealStatus, DealType, DisclosureTier, RegionCode, SubscriptionTier, TurnoverBand, VdrGateResult, xof } from "@dealpme/domain";
import {
  NEVER_BELOW_T2,
  computeSuccessFee,
  indicativeRange,
  isIndexable,
  completeness,
  matchDeal,
  openVdr,
  requirementsFor,
  projectForTier,
  transition,
} from "../src/index.js";

describe("machine à états du deal", () => {
  it("refuse la publication ouverte d'une cession de titres", () => {
    const r = transition(DealStatus.VERIFIED, DealStatus.LISTED_OPEN, { dealType: DealType.SHARE_DEAL });
    expect(r.ok).toBe(false);
  });
  it("exige l'autorisation du RPS pour un cercle restreint", () => {
    expect(transition(DealStatus.VERIFIED, DealStatus.LISTED_RESTRICTED, { dealType: DealType.SHARE_DEAL }).ok).toBe(false);
    expect(transition(DealStatus.VERIFIED, DealStatus.LISTED_RESTRICTED, { dealType: DealType.SHARE_DEAL, rpsPublicationAuthorized: true }).ok).toBe(true);
  });
  it("crée un FeeEvent à l'entrée en CLOSED_REPORTED", () => {
    const r = transition(DealStatus.NEGOTIATION, DealStatus.CLOSED_REPORTED, { dealType: DealType.ASSET_DEAL });
    expect(r).toEqual({ ok: true, to: DealStatus.CLOSED_REPORTED, createsFeeEvent: true });
  });
  it("refuse une transition invalide", () => {
    expect(transition(DealStatus.DRAFT, DealStatus.CLOSED_REPORTED, { dealType: DealType.ASSET_DEAL }).ok).toBe(false);
  });
});

describe("allow-list de divulgation", () => {
  const full = {
    id: "x",
    dealType: DealType.SHARE_DEAL,
    sectorCode: "AGRO",
    regionCode: RegionCode.GRAND_LOME,
    turnoverBand: TurnoverBand.FROM_250M_TO_1B,
    isDealReady: true,
    disclosureTier: DisclosureTier.T0,
    askingPrice: 850_000_000,
    companyLegalName: "TropicVale Industries SA",
    offerTerms: "secret",
  };
  it("ne laisse jamais passer le prix ni l'identité sous T2 (DISCLOSURE_LEAK)", () => {
    for (const tier of [DisclosureTier.T0, DisclosureTier.T1] as const) {
      const p = projectForTier(full, tier) as Record<string, unknown>;
      for (const f of NEVER_BELOW_T2) {
        expect(p[f], `${f} fuit en ${tier}`).toBeUndefined();
      }
    }
  });
  it("expose le prix en T2 uniquement", () => {
    expect((projectForTier(full, DisclosureTier.T2) as Record<string, unknown>)["askingPrice"]).toBe(850_000_000);
  });
  it("n'indexe jamais une cession de titres", () => {
    expect(isIndexable(DealType.SHARE_DEAL, DisclosureTier.T0)).toBe(false);
    expect(isIndexable(DealType.ASSET_DEAL, DisclosureTier.T0)).toBe(true);
  });
});

describe("porte d'accès data room", () => {
  const base = { authenticated: true, qualified: true, admitted: true, ndaSigned: true, t2Granted: true, sellerApproved: true, revoked: false };
  it("suit la matrice d'états obligatoire", () => {
    expect(openVdr({ ...base, authenticated: false })).toBe(VdrGateResult.LOGIN_REQUIRED);
    expect(openVdr({ ...base, qualified: false })).toBe(VdrGateResult.QUALIFICATION_REQUIRED);
    expect(openVdr({ ...base, admitted: false })).toBe(VdrGateResult.ADMISSION_REQUIRED);
    expect(openVdr({ ...base, ndaSigned: false })).toBe(VdrGateResult.NDA_REQUIRED);
    expect(openVdr({ ...base, t2Granted: false })).toBe(VdrGateResult.T2_GRANT_REQUIRED);
    expect(openVdr(base)).toBe(VdrGateResult.VDR_HOME);
  });
  it("la révocation l'emporte sur tout (REVOKED_ACCESS_ALLOWED)", () => {
    expect(openVdr({ ...base, revoked: true })).toBe(VdrGateResult.ACCESS_REVOKED);
  });
});

describe("matching explicable", () => {
  it("porte toujours une justification et refuse un type non demandé", () => {
    const deal = { id: "d", dealType: DealType.ASSET_DEAL, sectorCode: "AGRO", regionCode: RegionCode.MARITIME, turnoverBand: TurnoverBand.LT_50M, isDealReady: false };
    const ok = matchDeal(deal, { sectorCodes: ["AGRO"], regionCodes: [], turnoverBands: [], dealTypes: [DealType.ASSET_DEAL], dealReadyOnly: false });
    expect(ok.score).toBeGreaterThan(0);
    expect(ok.reasons.length).toBeGreaterThan(0);
    const ko = matchDeal(deal, { sectorCodes: [], regionCodes: [], turnoverBands: [], dealTypes: [DealType.SHARE_DEAL], dealReadyOnly: false });
    expect(ko.score).toBe(0);
  });
});

describe("évaluation indicative", () => {
  it("affiche méthode, sources et avertissement", () => {
    const r = indicativeRange({ ebitdaXof: xof(100_000_000), netDebtXof: 20_000_000, restatements: [], multiples: { low: 4, high: 6, source: "Comparables synthétiques PT-001", asOf: "2026-09-01" } });
    expect(r.equityValueLowXof).toBe(380_000_000);
    expect(r.equityValueHighXof).toBe(580_000_000);
    expect(r.disclaimer).toContain("non opposable");
    expect(r.sources[0]).toContain("PT-001");
  });
});

describe("frais de succès", () => {
  it("applique le barème par tranche et le minimum Premium", () => {
    const small = computeSuccessFee(xof(10_000_000), SubscriptionTier.PREMIUM);
    expect(small.minimumApplied).toBe(true);
    expect(small.feeXof).toBe(1_500_000);
    const big = computeSuccessFee(xof(2_000_000_000), SubscriptionTier.ELITE);
    expect(big.ratePercent).toBe(3);
    expect(big.platformShareXof + big.institutionShareXof).toBe(big.feeXof);
  });
});

describe("liste des pièces du dossier cédant", () => {
  it("branche les exigences sur le type de cession dès l'étape 1", () => {
    const asset = requirementsFor(DealType.ASSET_DEAL).map((r) => (r.kind === "fact" ? r.key : r.category));
    const share = requirementsFor(DealType.SHARE_DEAL).map((r) => (r.kind === "fact" ? r.key : r.category));
    expect(asset).toContain("INVENTAIRE_ACTIFS");
    expect(asset).not.toContain("REGISTRE_TITRES");
    expect(share).toContain("TRANSFER_RESTRICTIONS");
    expect(share).not.toContain("ASSETS_DESCRIPTION");
  });

  it("un dossier vide n'est pas complet et nomme chaque manque", () => {
    const r = completeness({ dealType: DealType.ASSET_DEAL, factKeys: [], documentCategories: [] });
    expect(r.complete).toBe(false);
    expect(r.ratio).toBe(0);
    expect(r.missing.length).toBe(requirementsFor(DealType.ASSET_DEAL).length);
    expect(r.missing.every((m) => m.label.length > 0 && m.step.length > 0)).toBe(true);
  });

  it("un dossier dont toutes les exigences sont satisfaites est complet", () => {
    const req = requirementsFor(DealType.ASSET_DEAL);
    const r = completeness({
      dealType: DealType.ASSET_DEAL,
      factKeys: req.filter((x) => x.kind === "fact").map((x) => x.key),
      documentCategories: req.filter((x) => x.kind === "document").map((x) => x.category),
    });
    expect(r.complete).toBe(true);
    expect(r.ratio).toBe(1);
    expect(r.missing).toEqual([]);
  });

  it("une pièce manquante suffit à laisser le dossier incomplet", () => {
    const req = requirementsFor(DealType.SHARE_DEAL);
    const r = completeness({
      dealType: DealType.SHARE_DEAL,
      factKeys: req.filter((x) => x.kind === "fact").map((x) => x.key),
      documentCategories: req.filter((x) => x.kind === "document" && x.category !== "PACTE_ASSOCIES").map((x) => x.category),
    });
    expect(r.complete).toBe(false);
    expect(r.missing).toEqual([{ kind: "document", key: "PACTE_ASSOCIES", label: "Pacte d'associés, s'il existe", step: "PIECES" }]);
  });
});
