import { describe, expect, it } from "vitest";
import { DealType, DisclosureTier } from "@dealpme/domain";
import { GENESIS_HASH, computeHash, verifyChain, type ChainedEntry } from "../src/ledger/hash-chain.js";
import { circleStatus, countDisclosedPersons, decideCommunication, decidePublication } from "../src/gate/circle.js";

describe("journal réglementaire chaîné", () => {
  it("détecte toute altération d'une entrée", () => {
    const e1 = { sequence: 1, previousHash: GENESIS_HASH, action: "CIRCLE_CREATED", payload: { dealId: "d1", cap: 50 }, recordedAt: "2026-09-09T10:00:00.000Z" };
    const h1 = computeHash(e1);
    const e2 = { sequence: 2, previousHash: h1, action: "PERSON_ADMITTED", payload: { dealId: "d1", personId: "p1" }, recordedAt: "2026-09-09T10:05:00.000Z" };
    const chain: ChainedEntry[] = [{ ...e1, hash: h1 }, { ...e2, hash: computeHash(e2) }];
    expect(verifyChain(chain).valid).toBe(true);
    chain[1]!.payload = { dealId: "d1", personId: "p2" };
    expect(verifyChain(chain)).toEqual({ valid: false, brokenAt: 2 });
  });
});

describe("compteur et plafond du cercle", () => {
  const d = (personId: string, group: string | null = null, tier: DisclosureTier = DisclosureTier.T1, revoked = false) => ({ personId, relatedPersonGroupId: group, tier, revokedAt: revoked ? new Date() : null });
  it("compte des personnes, pas des sessions, et les personnes liées une seule fois", () => {
    expect(countDisclosedPersons([d("a"), d("a"), d("b", "g1"), d("c", "g1")])).toBe(2);
  });
  it("ignore T0 et les révocations", () => {
    expect(countDisclosedPersons([d("a", null, DisclosureTier.T0), d("b", null, DisclosureTier.T1, true)])).toBe(0);
  });
  it("bascule en admission manuelle renforcée à 80 % et bloque à 100 %", () => {
    const eight = Array.from({ length: 8 }, (_, i) => d(`p${i}`));
    expect(circleStatus(eight, 10).mode).toBe("MANUAL_ADMISSION");
    expect(circleStatus([...eight, d("x"), d("y")], 10).mode).toBe("FULL");
    expect(circleStatus(eight.slice(0, 3), 10).mode).toBe("AUTOMATIC_BLOCKED");
  });
});

describe("décision de publication", () => {
  it("bloque une cession de titres sur surface ouverte (argument de nullité)", () => {
    const r = decidePublication({ dealType: DealType.SHARE_DEAL, requestedTier: DisclosureTier.T0, audience: "OPEN_SURFACE" });
    expect(r.allowed).toBe(false);
  });
  it("autorise T0 d'une cession de titres à un compte authentifié, pas T1", () => {
    expect(decidePublication({ dealType: DealType.SHARE_DEAL, requestedTier: DisclosureTier.T0, audience: "AUTHENTICATED" }).allowed).toBe(true);
    expect(decidePublication({ dealType: DealType.SHARE_DEAL, requestedTier: DisclosureTier.T1, audience: "AUTHENTICATED" }).allowed).toBe(false);
  });
  it("autorise une cession d'actifs en T1 mais exige le cercle pour T2", () => {
    expect(decidePublication({ dealType: DealType.ASSET_DEAL, requestedTier: DisclosureTier.T1, audience: "AUTHENTICATED" }).allowed).toBe(true);
    expect(decidePublication({ dealType: DealType.ASSET_DEAL, requestedTier: DisclosureTier.T2, audience: "AUTHENTICATED" }).allowed).toBe(false);
  });
});

describe("filtre de communication", () => {
  it("caviarde en T1 et bloque en T0 quand le message contient des termes sensibles", () => {
    expect(decideCommunication(DealType.SHARE_DEAL, DisclosureTier.T1, true)).toBe("REDACT");
    expect(decideCommunication(DealType.SHARE_DEAL, DisclosureTier.T0, true)).toBe("BLOCK");
    expect(decideCommunication(DealType.ASSET_DEAL, DisclosureTier.T0, true)).toBe("PERMIT");
  });
});
