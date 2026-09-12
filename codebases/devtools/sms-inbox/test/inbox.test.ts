import { afterEach, describe, expect, it } from "vitest";
import { request as httpRequest, type Server } from "node:http";
import { SmsInbox } from "../src/inbox.js";
import { createInboxServer } from "../src/server.js";

const msg = { toE164: "+22890000001", text: "Code 123456", category: "OTP" as const, delivery: { idempotencyKey: "same-key", correlationId: "test" } };
const servers: Server[] = [];
async function server() {
  const app = createInboxServer({ apiKey: "test-secret", nodeEnv: "test" }); servers.push(app);
  await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
  const address = app.address();
  if (!address || typeof address === "string") throw new Error("Port absent");
  return `http://127.0.0.1:${address.port}`;
}
afterEach(async () => { for (const app of servers.splice(0)) { app.closeAllConnections(); await new Promise<void>((resolve) => app.close(() => resolve())); } });

describe("boîte SMS bornée", () => {
  it("dédoublonne et refuse un autre contenu pour la même clé", () => {
    const box = new SmsInbox();
    const first = box.accept(msg);
    expect(box.accept(msg)).toMatchObject({ providerRef: first.providerRef, replayed: true, simulated: true });
    expect(box.list({ limit: 10 }).items).toHaveLength(1);
    expect(() => box.accept({ ...msg, text: "autre" })).toThrow();
  });
  it("ne supprime pas un message non expiré pour faire de la place", () => {
    const box = new SmsInbox(1);
    box.accept(msg);
    expect(() => box.accept({ ...msg, delivery: { ...msg.delivery, idempotencyKey: "second" } })).toThrow();
    expect(box.accept(msg).replayed).toBe(true);
  });
  it("expire la mémoire et permet une réinitialisation explicite", () => {
    let now = 0; const box = new SmsInbox(1, 100, () => now);
    box.accept(msg); now = 101;
    expect(box.list({ limit: 10 }).items).toHaveLength(0);
    box.accept(msg); box.clear(); expect(box.list({ limit: 10 }).items).toHaveLength(0);
  });
  it("refuse un numéro invalide ou un message expiré", () => {
    const box = new SmsInbox();
    expect(() => box.accept({ ...msg, toE164: "90000001" })).toThrow();
    expect(() => box.accept({ ...msg, delivery: { ...msg.delivery, expiresAt: "2000-01-01T00:00:00Z" } })).toThrow();
  });
  it("filtre et pagine sans doublon", () => {
    const box = new SmsInbox();
    for (let i = 0; i < 5; i++) box.accept({ ...msg, delivery: { ...msg.delivery, idempotencyKey: String(i) } });
    const first = box.list({ limit: 2, correlationId: "test" });
    const second = box.list({ limit: 2, cursor: first.nextCursor! });
    expect(second.items.every((m) => !first.items.some((n) => n.id === m.id))).toBe(true);
    expect(box.list({ limit: 10, toE164: "+22899999999" }).items).toHaveLength(0);
  });
});

describe("API locale", () => {
  it("refuse la production", () => expect(() => createInboxServer({ apiKey: "secret", nodeEnv: "production" })).toThrow());
  it("protège l'envoi et les commandes de test", async () => {
    const base = await server();
    expect((await fetch(`${base}/messages`, { method: "POST", body: JSON.stringify(msg) })).status).toBe(401);
    expect((await fetch(`${base}/test-controls`, { method: "POST", body: "{}" })).status).toBe(401);
    expect((await fetch(`${base}/messages`, { method: "DELETE" })).status).toBe(401);
  });
  it("rejette host/origine étrangers et les corps trop volumineux", async () => {
    const base = await server();
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = httpRequest(`${base}/messages`, { headers: { host: "rebinding.example" } }, (res) => { res.resume(); resolve(res.statusCode); });
      req.on("error", reject); req.end();
    });
    expect(status).toBe(403);
    expect((await fetch(`${base}/messages`, { method: "POST", headers: { authorization: "Bearer test-secret", origin: "https://example.com" }, body: JSON.stringify(msg) })).status).toBe(403);
    expect((await fetch(`${base}/messages`, { method: "POST", headers: { authorization: "Bearer test-secret" }, body: "x".repeat(40000) })).status).toBe(413);
  });
  it("marque l'acceptation comme simulée et permet le rejeu", async () => {
    const base = await server();
    const post = () => fetch(`${base}/messages`, { method: "POST", headers: { authorization: "Bearer test-secret" }, body: JSON.stringify(msg) }).then((r) => r.json());
    const first = await post(), second = await post();
    expect(second).toMatchObject({ providerRef: first.providerRef, replayed: true, simulated: true });
    const list = await (await fetch(`${base}/messages?idempotencyKey=same-key`)).json();
    expect(list.items).toHaveLength(1); expect(list.items[0].state).toBe("SIMULATED_ACCEPTED");
  });
});
