import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createRemoApiAdapter } from "../src/adapters/remo-api.js";

const companyId = "644662cc766fdabb714cf9f9", eventId = "65e679489d9954bfc7e10f42";
const contract = JSON.parse(readFileSync(new URL("../contracts/openapi.json", import.meta.url), "utf8"));
const requests: { method: string; path: string; authorization: string; body: Record<string, unknown> | null }[] = [];
let status = 200, custom: unknown, delayed = false;
const providerEvent = { _id: eventId, code: "rencontre", name: "Rencontre", company: companyId, startTime: Date.parse("2026-10-01T10:00:00Z"), endTime: Date.parse("2026-10-01T11:00:00Z"), isPrivate: true };
const server = createServer(async (req, res) => {
  const parts = []; for await (const chunk of req) parts.push(chunk);
  const text = Buffer.concat(parts).toString();
  const body = text ? JSON.parse(text) : null;
  requests.push({ method: req.method!, path: req.url!, authorization: req.headers.authorization ?? "", body });
  const data = custom ?? (req.method === "GET" || req.url?.includes("/companies/") ? { isSuccess: true, event: providerEvent } : { isSuccess: true });
  const reply = () => { res.writeHead(status, { "Content-Type": "application/json", "Retry-After": "3", Location: "/unexpected" }); res.end(JSON.stringify(data)); };
  if (delayed) { const timer = setTimeout(reply, 1000); res.once("close", () => clearTimeout(timer)); } else reply();
});
let baseUrl: string;
const adapter = () => createRemoApiAdapter({ companyId, apiKey: "contract-key", baseUrl, localContractTest: true, timeoutMs: 100 });
const input = () => ({ requestKey: randomUUID(), title: "Rencontre", startsAt: "2026-10-01T10:00:00Z", endsAt: "2026-10-01T11:00:00Z", capacity: 20, description: "Échanges B2B", branding: { label: "CCI", accent: "#123456", welcome: "Bienvenue", logoUrl: "https://example.test/brand.png", coverUrl: "https://example.test/cover.png", welcomeMediaUrl: "https://example.test/welcome.png" } });
const reset = () => { status = 200; custom = undefined; delayed = false; requests.length = 0; };

describe("Contrat HTTP Remo officiel", () => {
  beforeAll(async () => { await new Promise<void>(ok => server.listen(0, "127.0.0.1", ok)); const address = server.address(); if (!address || typeof address === "string") throw new Error("Port absent"); baseUrl = `http://127.0.0.1:${address.port}/api/v1`; });
  afterAll(async () => { server.closeAllConnections(); await new Promise<void>(ok => server.close(() => ok())); });
  it("s'appuie sur le Swagger archivé et son authentification spécifique", () => {
    expect(contract.info.title).toBe("Remo - External API");
    expect(contract.components.securitySchemes.ApiKeyAuth.description).toContain("Token:");
    for (const [path, method] of [["/companies/{companyId}/events", "post"], ["/events/{eventId}", "put"], ["/events/{eventId}", "delete"], ["/events/{eventId}/members", "post"], ["/events/{eventId}/attendees", "get"]]) expect(contract.paths[path!][method!]).toBeDefined();
  });
  it("crée avec millisecondes, théâtre, branding documenté et visibilité sur invitation", async () => {
    reset(); const result = await adapter().createEvent(input());
    expect(result.simulated).toBe(false);
    const sent = requests[0]!; expect(sent.path).toBe(`/api/v1/companies/${companyId}/events`); expect(sent.authorization).toBe("Token: contract-key");
    expect(sent.body).toMatchObject({ isPrivate: true, isDiscoveryOptedOut: true, startTime: providerEvent.startTime, theaters: [{ capacity: 20, template: "PHOTOREALISTIC-PHOTO-REALISTIC", theme: "REALISTIC" }], eventBrandingLogoURL: "https://example.test/brand.png", logoURL: "https://example.test/cover.png", welcomeMessage: { mediaType: "image" } });
    expect(sent.body).not.toHaveProperty("requestKey"); expect(sent.body).not.toHaveProperty("accent");
  });
  it("lit une référence du bon compte et construit seulement une URL de connexion", async () => {
    reset(); const result = await adapter().getEvent(eventId); expect(result.joinUrl).toBe("https://virtual.events.com/e/rencontre");
    custom = { isSuccess: true, event: { ...providerEvent, company: "aaaaaaaaaaaaaaaaaaaaaaaa" } };
    await expect(adapter().getEvent(eventId)).rejects.toMatchObject({ code: "MALFORMED" });
  });
  it("modifie le contenu et supprime par référence distante, jamais par clé locale", async () => {
    reset(); await adapter().updateEvent(eventId, input()); await adapter().cancelEvent(eventId);
    expect(requests.map(r => r.method)).toEqual(["PUT", "DELETE"]);
    expect(requests[0]!.body).not.toHaveProperty("startTime");
    await expect(adapter().cancelEvent(randomUUID())).rejects.toThrow();
  });
  it("invite par email et gère les groupes avec les corps documentés", async () => {
    reset(); await adapter().addMembers(eventId, ["participant@example.test"], "attendee");
    await adapter().changeGroup(eventId, "groupe-test", "participant@example.test", true);
    await adapter().changeGroup(eventId, "groupe-test", "participant@example.test", false);
    expect(requests[0]!.body).toEqual({ emails: ["participant@example.test"], role: "attendee" });
    expect(requests[2]!.method).toBe("DELETE"); expect(requests[2]!.body).toEqual({ emailId: "participant@example.test" });
  });
  it("projette la présence sans profils, réponses de formulaire ni tokens fournisseur", async () => {
    reset(); custom = { isSuccess: "true", attendees: [{ user: { id: "remote-person", email: "participant@example.test", profile: { secret: "omitted" } }, role: "attendee", sessionData: { enteredEventAt: "2026-10-01T10:01:00Z", leftEventAt: providerEvent.endTime }, answers: ["omitted"] }] };
    const list = await adapter().attendees(eventId); expect(list[0]!.joinedAt).toBe("2026-10-01T10:01:00Z"); expect(JSON.stringify(list)).not.toContain("omitted"); expect(requests[0]!.path).toContain("include=attendance");
  });
  it("supporte découverte paginée et rapport de présence documentés", async () => {
    reset(); custom = { events: [{ id: eventId, code: "rencontre", title: "Rencontre" }] }; expect(await adapter().discover("Événement", 10, 20)).toHaveLength(1); expect(requests[0]!.path).toContain("offset=20");
    custom = { attendances: [{ attendeeEmail: "participant@example.test", eventUrl: "https://virtual.events.com/e/rencontre", loginTime: "2026-10-01T10:01:00Z", logoutTime: null, role: "attendee", attended: true }] };
    expect(await adapter().attendanceReport("host@example.test", "2026-10-01T00:00:00Z", "2026-10-02T00:00:00Z")).toHaveLength(1);
  });
  it.each([[401, "AUTHENTICATION"], [403, "FORBIDDEN"], [429, "RATE_LIMITED"], [500, "UNKNOWN"]])("refus HTTP %s sans reprise automatique du POST", async (httpStatus, code) => {
    reset(); status = Number(httpStatus); await expect(adapter().createEvent(input())).rejects.toMatchObject({ code }); expect(requests).toHaveLength(1);
  });
  it("timeout après envoi : résultat inconnu et un seul POST", async () => {
    reset(); delayed = true; await expect(adapter().createEvent(input())).rejects.toMatchObject({ code: "UNKNOWN" }); expect(requests).toHaveLength(1); delayed = false;
  });
  it("réponse mensongère, surdimensionnée et redirection refusées", async () => {
    reset(); custom = { isSuccess: false }; await expect(adapter().createEvent(input())).rejects.toMatchObject({ code: "MALFORMED" });
    custom = { data: "x".repeat(9 * 1024 * 1024) }; await expect(adapter().getEvent(eventId)).rejects.toThrow();
    reset(); status = 302; await expect(adapter().getEvent(eventId)).rejects.toThrow(); expect(requests).toHaveLength(1);
  });
  it("ne confond pas un lien de salle avec un SSO ou un webhook documenté", async () => {
    reset(); await expect(adapter().participantJoinUrl(eventId, "user", "name")).rejects.toMatchObject({ code: "DISABLED" }); expect(adapter().verifyWebhook("{}", "anything")).toBe(false);
    expect(() => createRemoApiAdapter({ apiKey: "key", companyId, baseUrl })).toThrow();
  });
});
