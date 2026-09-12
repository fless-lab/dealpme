import { describe, expect, it } from "vitest";
import { ManualRegistryResultSchema, registryOutcome } from "../src/modules/institution/registry-review.js";
import type { RegistryLookupResult } from "@dealpme/connector-registry";

describe("Prérequis registre", () => {
  const declared = { legalName: "Entreprise synthétique CFE", legalForm: "SARL", rccmNumber: "TG-TEST" };
  const result: RegistryLookupResult = { ...declared, found: true, status: "ACTIVE", provider: "mock", synthetic: true, sourceRef: "SYNTHETIC-TEST", verifiedAt: new Date().toISOString() };
  it("ne remplit jamais les champs absents par le déclaratif", () => {
    expect(registryOutcome({ ...result, legalForm: undefined }, declared, "TG-TEST")).toBe("INCOMPLETE");
    expect(registryOutcome({ ...result, found: false }, declared, "TG-TEST")).toBe("NOT_FOUND");
  });
  it("identité et statut déterminent la conformité, indépendamment de la décision Deal-Ready", () => {
    expect(registryOutcome(result, declared, " tg-test ")).toBe("CONFIRMED");
    expect(registryOutcome(result, { ...declared, legalName: "Autre" }, "TG-TEST")).toBe("DIVERGENT");
    expect(registryOutcome(result, declared, "TG-AUTRE")).toBe("DIVERGENT");
    expect(registryOutcome({ ...result, status: "STRUCK_OFF" }, declared, "TG-TEST")).toBe("STRUCK_OFF");
  });
  it("saisie manuelle : source et motifs obligatoires", () => {
    expect(ManualRegistryResultSchema.safeParse({ ...result, sourceRef: "  " }).success).toBe(false);
    expect(ManualRegistryResultSchema.safeParse({ ...result, decision: "NEEDS_INFO" }).success).toBe(false);
    expect(ManualRegistryResultSchema.safeParse({ ...result, decision: "NEEDS_INFO", reason: "Extrait illisible" }).success).toBe(true);
  });
});
