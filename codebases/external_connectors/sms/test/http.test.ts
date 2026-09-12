import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { createGenericHttpAdapter } from "../src/adapters/generic-http.js";
import { createFakeSms } from "../src/fake.js";
import { createInboxServer } from "../../../devtools/sms-inbox/src/server.js";

const servers: Server[] = [];
const message = { toE164: "+22890000001", text: "Échange reçu 🙂", category: "OTP" as const, delivery: { idempotencyKey: "wire-key", correlationId: "wire" } };
async function fixture() {
  const app = createInboxServer({ apiKey: "wire-secret", nodeEnv: "test" }); servers.push(app);
  await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
  const address = app.address(); if (!address || typeof address === "string") throw new Error("Port absent");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const adapter = createGenericHttpAdapter({ baseUrl, apiKey: "wire-secret", local: true, policy: { totalTimeoutMs: 1000, attemptTimeoutMs: 100, maxAttempts: 3, retryDelayMs: 1 } });
  const control = async (mode: string, count = 1) => {
    const response = await fetch(`${baseUrl}/test-controls`, { method: "POST", headers: { authorization: "Bearer wire-secret" }, body: JSON.stringify({ mode, count, delayMs: 300 }) });
    expect(response.status).toBe(200);
  };
  const messages = () => fetch(`${baseUrl}/messages`).then((r) => r.json());
  return { baseUrl, adapter, control, messages };
}
afterEach(async () => { vi.unstubAllGlobals(); for (const app of servers.splice(0)) { app.closeAllConnections(); await new Promise<void>((resolve) => app.close(() => resolve())); } });

describe("passerelle SMS JSON", () => {
  it("préserve numéro, Unicode et corrélation sur le réseau", async () => {
    const f = await fixture();
    expect(await f.adapter.send(message)).toMatchObject({ status: "ACCEPTED", simulated: true, attempts: 1 });
    const data = await f.messages(); expect(data.items[0]).toMatchObject(message); expect(data.items[0].encoding).toBe("UCS-2");
  });
  it.each(["rate-limit", "unavailable"])("reprend %s sans changer de message ni clé", async (mode) => {
    const f = await fixture(); await f.control(mode);
    expect((await f.adapter.send(message)).attempts).toBe(2); expect((await f.messages()).items).toHaveLength(1);
  });
  it("ne crée pas de doublon après une acceptation dont la réponse a été perdue", async () => {
    const f = await fixture(); await f.control("accepted-timeout");
    expect((await f.adapter.send(message)).attempts).toBe(2);
    expect((await f.messages()).items).toHaveLength(1);
  });
  it("borne un silence répété", async () => {
    const f = await fixture(); await f.control("timeout", 3);
    await expect(f.adapter.send(message)).rejects.toMatchObject({ code: "RESULT_UNKNOWN" });
    expect((await f.messages()).items).toHaveLength(0);
  });
  it("ne réessaie pas un refus permanent ou une clé invalide", async () => {
    const f = await fixture(); await f.control("reject");
    await expect(f.adapter.send(message)).rejects.toMatchObject({ code: "RECIPIENT_REJECTED" });
    const invalid = createGenericHttpAdapter({ baseUrl: f.baseUrl, apiKey: "incorrect", local: true });
    await expect(invalid.send(message)).rejects.toMatchObject({ code: "CONFIGURATION_ERROR" });
    expect((await f.messages()).items).toHaveLength(0);
  });
  it("refuse expiration et réemploi d'une clé avec un autre contenu", async () => {
    const f = await fixture(); await f.adapter.send(message);
    await expect(f.adapter.send({ ...message, text: "autre" })).rejects.toMatchObject({ code: "RECIPIENT_REJECTED" });
    await expect(f.adapter.send({ ...message, delivery: { ...message.delivery, expiresAt: "2000-01-01T00:00:00Z" } })).rejects.toMatchObject({ code: "EXPIRED" });
  });
  it("la configuration réelle exige HTTPS et refuse une réponse simulée", async () => {
    expect(() => createGenericHttpAdapter({ baseUrl: "http://localhost:8026", apiKey: "key" })).toThrow();
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ providerRef: "simulation", status: "ACCEPTED", simulated: true })));
    vi.stubGlobal("fetch", fetch);
    await expect(createGenericHttpAdapter({ baseUrl: "https://gateway.example.test/v1", apiKey: "key" }).send(message)).rejects.toMatchObject({ code: "CONFIGURATION_ERROR" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("la réponse réelle compatible est normalisée et le jeton reste en en-tête", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ providerRef: "accepted-ref", status: "ACCEPTED" })));
    vi.stubGlobal("fetch", fetch);
    expect(await createGenericHttpAdapter({ baseUrl: "https://gateway.example.test/v1", apiKey: "test-key" }).send(message)).toMatchObject({ providerRef: "accepted-ref", status: "ACCEPTED" });
    expect(fetch.mock.calls[0]![0]).toBe("https://gateway.example.test/v1/messages");
    expect(fetch.mock.calls[0]![1].headers.authorization).toBe("Bearer test-key");
    expect(fetch.mock.calls[0]![1].body).not.toContain("test-key");
  });
  it("le faux respecte le même dédoublonnage et la validation", async () => {
    const fake = createFakeSms(); const first = await fake.send(message);
    expect((await fake.send(message)).providerRef).toBe(first.providerRef); expect(fake.sent).toHaveLength(1);
    await expect(fake.send({ ...message, toE164: "not-a-phone" })).rejects.toMatchObject({ code: "INVALID_MESSAGE" });
  });
  it("refuse une réponse invalide ou excessive au lieu d'annoncer un succès", async () => {
    for (const content of ["not-json", JSON.stringify({ providerRef: "r", status: "ACCEPTED", excess: "x".repeat(10000) })]) {
      vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(content))));
      const adapter = createGenericHttpAdapter({ baseUrl: "https://gateway.example.test", apiKey: "key", policy: { maxAttempts: 1 } });
      await expect(adapter.send(message)).rejects.toMatchObject({ code: "RESULT_UNKNOWN" });
    }
  });
});
