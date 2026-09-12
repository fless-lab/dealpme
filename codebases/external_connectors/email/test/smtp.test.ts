import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Socket } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { createSmtpAdapter } from "../src/adapters/smtp.js";
import { createFakeEmail } from "../src/fake.js";

const cleanups: (() => Promise<void>)[] = [];
const message = { to: "client@example.test", subject: "Vérification", text: "Votre code est 123456.", category: "TRANSACTIONAL" as const, delivery: { idempotencyKey: "email-key", correlationId: "email-test" } };
async function smtp(mode: "ok" | "temporary" | "reject" | "unknown" | "stall" | "auth") {
  let connections = 0; let accepted = 0;
  const messages: string[] = [], sockets = new Set<Socket>();
  const server = createServer((socket) => {
    const attempt = ++connections; sockets.add(socket); socket.on("close", () => sockets.delete(socket)); socket.on("error", () => {});
    let buffer = "", data = false;
    if (mode !== "stall") socket.write("220 local-test ESMTP\r\n");
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes("\r\n")) {
        if (data) {
          const end = buffer.indexOf("\r\n.\r\n"); if (end < 0) return;
          messages.push(buffer.slice(0, end)); buffer = buffer.slice(end + 5); data = false;
          if (mode === "temporary" && attempt === 1) socket.write("451 4.3.0 Retry later\r\n");
          else { accepted++; if (mode !== "unknown") socket.write("250 2.0.0 queued\r\n"); }
          continue;
        }
        const end = buffer.indexOf("\r\n"), line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (line.startsWith("EHLO")) socket.write(mode === "auth" ? "250-test\r\n250 AUTH PLAIN\r\n" : "250 test\r\n");
        else if (line.startsWith("AUTH")) socket.write("535 5.7.8 Authentication failed\r\n");
        else if (line.startsWith("STARTTLS")) socket.write("454 4.7.0 TLS not available\r\n");
        else if (line.startsWith("RCPT") && mode === "reject") socket.write("550 5.1.1 Rejected\r\n");
        else if (line === "DATA") { data = true; socket.write("354 Continue\r\n"); }
        else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Port absent");
  cleanups.push(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>((resolve) => server.close(() => resolve())); });
  const adapter = (extra = {}) => createSmtpAdapter({ host: "127.0.0.1", port: address.port, from: "notifications@example.test", policy: { totalTimeoutMs: 1000, attemptTimeoutMs: 150, maxAttempts: 3, retryDelayMs: 10 }, ...extra });
  return { adapter, messages, connections: () => connections, accepted: () => accepted, active: () => sockets.size };
}
afterEach(async () => { for (const close of cleanups.splice(0)) await close(); });

describe("SMTP réellement borné", () => {
  it("envoie un message MIME et ses en-têtes de corrélation", async () => {
    const fixture = await smtp("ok");
    const result = await fixture.adapter().send(message);
    expect(result).toMatchObject({ status: "ACCEPTED", attempts: 1 });
    expect(fixture.accepted()).toBe(1);
    expect(fixture.messages[0]).toMatch(/X-DealPME-Delivery-Key:\s*email-key/i);
  });
  it("reprend un refus temporaire connu avec le même message", async () => {
    const fixture = await smtp("temporary");
    expect((await fixture.adapter().send(message)).attempts).toBe(2);
    expect(fixture.accepted()).toBe(1); expect(fixture.messages[0]).toBe(fixture.messages[1]);
  });
  it("ne retransmet pas après acceptation suivie d'un silence", async () => {
    const fixture = await smtp("unknown");
    await expect(fixture.adapter().send(message)).rejects.toMatchObject({ code: "RESULT_UNKNOWN" });
    expect(fixture.connections()).toBe(1); expect(fixture.accepted()).toBe(1);
    await delay(20); expect(fixture.active()).toBe(0);
  });
  it("ferme une connexion sans salutation au dépassement de délai", async () => {
    const fixture = await smtp("stall");
    await expect(fixture.adapter().send(message)).rejects.toBeInstanceOf(Error);
    await delay(20); expect(fixture.active()).toBe(0);
  });
  it("ne réessaie pas une adresse rejetée", async () => {
    const fixture = await smtp("reject");
    await expect(fixture.adapter().send(message)).rejects.toMatchObject({ code: "RECIPIENT_REJECTED" });
    expect(fixture.connections()).toBe(1);
  });
  it("refuse l'authentification incorrecte sans repli anonyme", async () => {
    const fixture = await smtp("auth");
    await expect(fixture.adapter({ user: "test", password: "wrong" }).send(message)).rejects.toMatchObject({ code: "CONFIGURATION_ERROR" });
    expect(fixture.connections()).toBe(1); expect(fixture.accepted()).toBe(0);
  });
  it("n'envoie pas en clair si STARTTLS est obligatoire", async () => {
    const fixture = await smtp("ok");
    await expect(fixture.adapter({ requireTLS: true }).send(message)).rejects.toBeInstanceOf(Error);
    expect(fixture.accepted()).toBe(0);
  });
  it("refuse les en-têtes injectés, les messages expirés et le marketing sans désinscription", async () => {
    const fixture = await smtp("ok");
    const adapter = fixture.adapter();
    await expect(adapter.send({ ...message, subject: "Sujet\r\nBcc:intrus@example.test" })).rejects.toMatchObject({ code: "INVALID_MESSAGE" });
    await expect(adapter.send({ ...message, category: "MARKETING" })).rejects.toMatchObject({ code: "INVALID_MESSAGE" });
    await expect(adapter.send({ ...message, delivery: { ...message.delivery, expiresAt: "2000-01-01T00:00:00Z" } })).rejects.toMatchObject({ code: "EXPIRED" });
    expect(fixture.connections()).toBe(0);
  });
  it("le faux respecte validation, expiration et dédoublonnage de son contrat", async () => {
    const fake = createFakeEmail();
    const first = await fake.send(message);
    expect((await fake.send(message)).providerRef).toBe(first.providerRef); expect(fake.sent).toHaveLength(1);
    await expect(fake.send({ ...message, text: "différent" })).rejects.toMatchObject({ code: "INVALID_MESSAGE" });
  });
});
