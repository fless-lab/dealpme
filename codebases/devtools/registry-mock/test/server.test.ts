import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMockRegistryAdapter, createManualEntryAdapter, resolveRegistryConfig } from "@dealpme/connector-registry";
import { createRegistryMock } from "../src/server.js";

describe("CFE HTTP synthétique et sélection stricte", () => {
  const server = createRegistryMock({ nodeEnv: "test" });
  let baseUrl: string;
  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Port absent");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); });
  it("désactivé : URL invalide ignorée et aucun appel réseau", async () => {
    const before = await fetch(`${baseUrl}/health`).then((r) => r.json());
    expect(resolveRegistryConfig({ CFE_API_ENABLED: "false", CFE_API_BASE_URL: "invalide", CONNECTOR_REGISTRY_PROVIDER: "cfe" }).enabled).toBe(false);
    await expect(createManualEntryAdapter().lookup({ rccmNumber: "TG-MOCK-MATCH" })).rejects.toMatchObject({ code: "MANUAL_REQUIRED" });
    expect(await fetch(`${baseUrl}/health`).then((r) => r.json())).toEqual(before);
  });
  it("compatibilité de l'ancien mode et refus des conflits/valeurs invalides", () => {
    expect(resolveRegistryConfig({ CONNECTOR_REGISTRY_MODE: "api" }).enabled).toBe(true);
    expect(() => resolveRegistryConfig({ CFE_API_ENABLED: "false", CONNECTOR_REGISTRY_MODE: "api" })).toThrow(/conflit/);
    expect(() => resolveRegistryConfig({ CFE_API_ENABLED: "yes" })).toThrow();
    expect(() => resolveRegistryConfig({ CONNECTOR_REGISTRY_PROVIDER: "autre" })).toThrow();
    expect(() => resolveRegistryConfig({ CFE_API_ENABLED: "true", CONNECTOR_REGISTRY_PROVIDER: "cfe" })).toThrow(/non qualifié/);
    expect(() => resolveRegistryConfig({ CFE_API_ENABLED: "true", NODE_ENV: "production" })).toThrow(/production/);
    expect(() => createRegistryMock({ nodeEnv: "production" })).toThrow();
  });
  it.each(["MATCH", "DIVERGENT", "STRUCK", "INCOMPLETE", "ABSENT"])("résultat %s avec provenance", async (scenario) => {
    const result = await createMockRegistryAdapter({ baseUrl, timeoutMs: 1000 }).lookup({ rccmNumber: ` tg-mock-${scenario} ` });
    expect(result.synthetic).toBe(true);
    expect(result.provider).toBe("mock");
    expect(result.sourceRef).toMatch(/^SYNTHETIC-/);
    expect(result.found).toBe(scenario !== "ABSENT");
    if (scenario === "INCOMPLETE") expect(result.legalForm).toBeUndefined();
    if (scenario === "STRUCK") expect(result.status).toBe("STRUCK_OFF");
  });
  it.each([["MALFORMED", "MALFORMED"], ["429", "RATE_LIMITED"], ["503", "UNAVAILABLE"], ["TIMEOUT", "TIMEOUT"]])("incident %s distinct d'une absence", async (scenario, code) => {
    await expect(createMockRegistryAdapter({ baseUrl, timeoutMs: 100 }).lookup({ rccmNumber: `TG-MOCK-${scenario}` })).rejects.toMatchObject({ code });
  });
  it("refuse une origine navigateur et un scénario injecté dans le corps", async () => {
    expect((await fetch(`${baseUrl}/lookups`, { method: "POST", headers: { origin: "https://evil.example" } })).status).toBe(403);
    expect((await fetch(`${baseUrl}/lookups`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rccmNumber: "TG-MOCK-MATCH", scenario: "MATCH" }) })).status).toBe(400);
  });
});
