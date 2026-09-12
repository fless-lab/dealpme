import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { inflateRawSync, deflateRawSync } from "node:zlib";
import { IdentityProvider, ServiceProvider } from "samlify";
import { createSamlIdentityProvider } from "../src/index.js";

const POST = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST";
const config = { idpEntityId: "https://dealpme.example.test/sso/remo/metadata", ssoUrl: "https://dealpme.example.test/sso/remo", spEntityId: "http://live.remo.co/", acsUrl: "https://live.remo.co/__/auth/handler", privateKey: "", certificate: "" };
let directory: string, federation: ReturnType<typeof createSamlIdentityProvider>;
const sp = ServiceProvider({ entityID: config.spEntityId, authnRequestsSigned: false, wantAssertionsSigned: true, wantMessageSigned: false, assertionConsumerService: [{ Binding: POST, Location: config.acsUrl, isDefault: true }] });
const login = (forceAuthn = false) => {
  const result = sp.createLoginRequest(IdentityProvider({ metadata: federation.metadata() }), "redirect", { forceAuthn, relayState: "request-scoped" });
  return new URL(result.context).searchParams.get("SAMLRequest")!;
};
const mutate = (value: string, transform: (xml: string) => string) => deflateRawSync(transform(inflateRawSync(Buffer.from(value, "base64")).toString())).toString("base64");
describe("Fédération SAML SP-initiated", () => {
  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), "dealpme-saml-test-"));
    const result = spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(directory, "key.pem"), "-out", join(directory, "cert.pem"), "-days", "1", "-subj", "/CN=dealpme.example.test"], { stdio: "ignore" });
    expect(result.status).toBe(0);
    config.privateKey = readFileSync(join(directory, "key.pem"), "utf8"); config.certificate = readFileSync(join(directory, "cert.pem"), "utf8");
    federation = createSamlIdentityProvider(config);
  });
  afterAll(() => { vi.useRealTimers(); rmSync(directory, { recursive: true, force: true }); });
  it("émet une assertion email signée RSA-SHA256 vérifiée par un vrai parseur SP", async () => {
    const request = await federation.prepare(login(), "redirect", "request-scoped");
    const response = await federation.respond(request, { email: "participant@example.test", authenticatedAt: new Date() });
    const xml = Buffer.from(response.samlResponse, "base64").toString();
    expect(xml).toContain("rsa-sha256"); expect(xml).toContain("xmlenc#sha256"); expect(xml).toContain(request.requestId);
    expect(Date.parse(response.expiresAt) - Date.now()).toBeLessThanOrEqual(90000);
    const parsed = await sp.parseLoginResponse(IdentityProvider({ metadata: federation.metadata() }), "post", { body: { SAMLResponse: response.samlResponse } });
    expect(parsed.extract.nameID).toBe("participant@example.test"); expect(response.acsUrl).toBe(config.acsUrl); expect(response.relayState).toBe("request-scoped");
  });
  it("rejette une assertion altérée", async () => {
    const response = await federation.respond(await federation.prepare(login(), "redirect"), { email: "participant@example.test", authenticatedAt: new Date() });
    const tampered = Buffer.from(Buffer.from(response.samlResponse, "base64").toString().replace("participant@example.test", "attacker@example.test")).toString("base64");
    await expect(sp.parseLoginResponse(IdentityProvider({ metadata: federation.metadata() }), "post", { body: { SAMLResponse: tampered } })).rejects.toThrow();
  });
  it("épingles ACS, destination et issuer ; ne suit aucune URL entrante", async () => {
    for (const value of [config.acsUrl, config.ssoUrl, config.spEntityId]) await expect(federation.prepare(mutate(login(), xml => xml.replace(value, "https://evil.example/")), "redirect")).rejects.toThrow();
  });
  it("refuse XML externe et bombe de décompression", async () => {
    await expect(federation.prepare(Buffer.from('<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>').toString("base64"), "post")).rejects.toThrow();
    await expect(federation.prepare(deflateRawSync("x".repeat(100000)).toString("base64"), "redirect")).rejects.toThrow();
  });
  it("refuse requête ancienne, RelayState excessif et ForceAuthn sans nouvelle connexion", async () => {
    await expect(federation.prepare(mutate(login(), xml => xml.replace(/IssueInstant="[^"]+"/, 'IssueInstant="2000-01-01T00:00:00Z"')), "redirect")).rejects.toThrow();
    await expect(federation.prepare(login(), "redirect", "x".repeat(81))).rejects.toThrow();
    const forced = await federation.prepare(login(true), "redirect");
    await expect(federation.respond(forced, { email: "participant@example.test", authenticatedAt: new Date(Date.now() - 60000) })).rejects.toMatchObject({ code: "REAUTH_REQUIRED" });
  });
  it("ne mélange pas les RelayState de deux utilisateurs", async () => {
    const a = await federation.prepare(login(), "redirect", "A"), b = await federation.prepare(login(), "redirect", "B");
    const responses = await Promise.all([federation.respond(a, { email: "a@example.test", authenticatedAt: new Date() }), federation.respond(b, { email: "b@example.test", authenticatedAt: new Date() })]);
    expect(responses.map(r => r.relayState)).toEqual(["A", "B"]);
    expect(Buffer.from(responses[0]!.samlResponse, "base64").toString()).not.toContain("b@example.test");
  });
  it("refuse l'émission après expiration du challenge", async () => {
    const request = await federation.prepare(login(), "redirect");
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(Date.now() + 301000);
    try { await expect(federation.respond(request, { email: "participant@example.test", authenticatedAt: new Date() })).rejects.toMatchObject({ code: "EXPIRED" }); }
    finally { vi.useRealTimers(); }
  });
  it("publie deux certificats pendant la rotation et conserve la validation des assertions anciennes", async () => {
    const old = await federation.respond(await federation.prepare(login(), "redirect"), { email: "old@example.test", authenticatedAt: new Date() });
    expect(spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", join(directory, "next-key.pem"), "-out", join(directory, "next-cert.pem"), "-days", "1", "-subj", "/CN=next.dealpme.example.test"], { stdio: "ignore" }).status).toBe(0);
    const rotated = createSamlIdentityProvider({ ...config, privateKey: readFileSync(join(directory, "next-key.pem"), "utf8"), certificate: readFileSync(join(directory, "next-cert.pem"), "utf8"), previousCertificate: config.certificate });
    const newRequest = sp.createLoginRequest(IdentityProvider({ metadata: rotated.metadata() }), "redirect");
    const next = await rotated.respond(await rotated.prepare(new URL(newRequest.context).searchParams.get("SAMLRequest")!, "redirect"), { email: "new@example.test", authenticatedAt: new Date() });
    for (const [response,email] of [[old,"old@example.test"],[next,"new@example.test"]] as const) {
      const parsed = await sp.parseLoginResponse(IdentityProvider({ metadata: rotated.metadata() }), "post", { body: { SAMLResponse: response.samlResponse } });
      expect(parsed.extract.nameID).toBe(email);
    }
    expect(rotated.metadata()).not.toContain("PRIVATE KEY");
  });
});
