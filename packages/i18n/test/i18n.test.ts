import { describe, expect, it } from "vitest";
import { OHADA_TERMS_NEVER_TRANSLATED, formatDateFr, formatPercentFr, formatXof, fr } from "../src/index.js";

const FINE = " "; // espace fine insécable
const NBSP = " ";

describe("formats français", () => {
  it("groupe les milliers avec une espace fine insécable et place le symbole après", () => {
    expect(formatXof(1_500_000)).toBe(`1${FINE}500${FINE}000${NBSP}FCFA`);
    expect(formatXof(999)).toBe(`999${NBSP}FCFA`);
    expect(formatXof(0)).toBe(`0${NBSP}FCFA`);
  });

  it("refuse un montant à décimale : le FCFA n'en a pas", () => {
    expect(() => formatXof(1500.5)).toThrow(RangeError);
  });

  it("garde le signe des montants négatifs", () => {
    expect(formatXof(-250_000)).toBe(`-250${FINE}000${NBSP}FCFA`);
  });

  it("écrit les dates d'interface en JJ/MM/AAAA", () => {
    expect(formatDateFr(new Date("2026-10-15T09:30:00Z"))).toBe("15/10/2026");
    expect(formatDateFr(new Date("2027-03-01T00:00:00Z"))).toBe("01/03/2027");
  });

  it("écrit les pourcentages avec une virgule décimale", () => {
    expect(formatPercentFr(12.5)).toBe(`12,5${FINE}%`);
    expect(formatPercentFr(100, 0)).toBe(`100${FINE}%`);
  });
});

describe("messages source", () => {
  it("porte les mentions qui ne se masquent pas", () => {
    expect(fr.common.syntheticDataBanner).toContain("synthétiques");
    expect(fr.common.declaredUnaudited).toContain("non auditées");
    expect(fr.common.indicativeNotBinding).toContain("non opposable");
  });

  it("distingue les codes d'erreur qui ne doivent pas se confondre", () => {
    const distincts = [fr.errors.PERIMETER_BLOCKED, fr.errors.FORBIDDEN, fr.errors.NOT_FOUND, fr.errors.INVALID_TRANSITION];
    expect(new Set(distincts).size).toBe(distincts.length);
    expect(fr.errors.PERIMETER_BLOCKED).toContain("périmètre réglementaire");
  });

  it("n'introduit aucun message vide", () => {
    const vides = Object.entries(fr.errors).filter(([, v]) => !v || v.trim().length < 5);
    expect(vides).toEqual([]);
  });
});

describe("termes OHADA", () => {
  it("liste les termes qui ne se traduisent jamais", () => {
    expect(OHADA_TERMS_NEVER_TRANSLATED).toContain("appel public à l'épargne");
    expect(OHADA_TERMS_NEVER_TRANSLATED).toContain("parts sociales");
    expect(OHADA_TERMS_NEVER_TRANSLATED).toContain("clause d'agrément");
  });
});
