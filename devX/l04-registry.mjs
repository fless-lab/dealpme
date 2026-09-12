import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import postgres from "postgres";
import { readOtp } from "./notification-inbox.mjs";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
if (!/^dealpme-ci-/.test(process.env.CI_TEST_PROJECT ?? "")) throw new Error("Pile CI isolée requise");
const target = new URL(process.env.DATABASE_URL_CORE_ADMIN);
const label = spawnSync("docker", ["inspect", "--format", '{{ index .Config.Labels "com.docker.compose.project" }}', process.env.SMOKE_CORE_CONTAINER], { encoding: "utf8" });
const port = spawnSync("docker", ["port", process.env.SMOKE_CORE_CONTAINER, "5432/tcp"], { encoding: "utf8" });
assert.equal(label.stdout.trim(), process.env.CI_TEST_PROJECT);
assert.equal(port.stdout.trim(), `127.0.0.1:${target.port}`);
assert.equal(target.hostname, "127.0.0.1");
const admin = postgres(process.env.DATABASE_URL_CORE_ADMIN, { max: 2 });
const app = postgres(process.env.DATABASE_URL_CORE, { max: 2 });
const base = `http://127.0.0.1:${process.env.API_PORT}/v1`;
const credentials = JSON.parse(readFileSync(process.env.DEMO_CREDENTIALS_FILE, "utf8"));
const report = { status: "RUNNING", startedAt: new Date().toISOString(), checks: [] };
const save = () => writeFileSync(resolve(root, ".ci-artifacts/l04-registry-results.json"), JSON.stringify(report, null, 2) + "\n");
async function check(name, work) {
  const row = { name, status: "RUNNING" }; report.checks.push(row); save();
  try { await work(); row.status = "PASS"; console.log(`[L04 CFE] OK ${name}`); }
  catch (error) { row.status = "FAIL"; throw error; } finally { save(); }
}
async function request(path, { token, body, status = body === undefined ? 200 : 201, api = base } = {}) {
  const res = await fetch(`${api}${path}`, { method: body === undefined ? "GET" : "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  const result = await res.json(); assert.equal(res.status, status, `${path}: ${JSON.stringify(result)}`); return result;
}
async function login(email) {
  const result = await request("/auth/login", { body: { email, password: credentials[email] }, status: 200 });
  return result.mfaRequired ? (await request("/auth/mfa/verify", { body: { challengeId: result.challengeId, code: await readOtp("sms", result.challengeId) }, status: 200 })).token : result.token;
}
async function freePort() { const server = createServer(); await new Promise((ok) => server.listen(0, "127.0.0.1", ok)); const port = server.address().port; await new Promise((ok) => server.close(ok)); return port; }
let child;
try {
  assert.equal(spawnSync("docker", ["exec", process.env.SMOKE_REDIS_CONTAINER, "redis-cli", "FLUSHDB"]).status, 0);
  const officer = await login("officier@cci-togo.demo.dealpme.local");
  const seller = await login("cedant.froidroute@demo.dealpme.local");
  const outsider = await login("cedant.tropicvale@demo.dealpme.local");
  const me = await request("/me", { token: seller });
  const newCompany = async (rccmNumber) => (await request("/companies", { token: seller, body: { legalName: "Entreprise synthétique CFE", legalForm: "SARL", rccmNumber } })).companyId;
  const companyId = await newCompany("TG-MANUAL-TEST");
  const manual = { legalName: "Entreprise synthétique CFE", legalForm: "SARL", status: "ACTIVE", sourceRef: "Extrait manuel synthétique de recette" };
  const body = { companyId, rccmNumber: "TG-MANUAL-TEST", legalForm: "SARL", manualResult: manual, requestId: randomUUID() };
  const certify = (id) => ({ companyId: id, decision: "GRANTED", scopeStatement: "Vérification documentaire nominative, sans garantie financière.", conflictOfInterestDeclared: false });
  let first;
  await check("Mode manuel : validation complète et zéro appel réseau", async () => {
    const before = await fetch(`${process.env.CFE_API_BASE_URL}/health`).then((r) => r.json());
    await request("/institution/registry-verifications", { token: officer, body: { ...body, manualResult: undefined }, status: 400 });
    first = await request("/institution/registry-verifications", { token: officer, body });
    assert.equal(first.outcome, "CONFIRMED"); assert(first.registryRecordId);
    assert.equal((await fetch(`${process.env.CFE_API_BASE_URL}/health`).then((r) => r.json())).lookups, before.lookups);
  });
  await check("Rejeu concurrent : une consultation, une preuve, un audit", async () => {
    const replies = await Promise.all(Array.from({ length: 5 }, () => request("/institution/registry-verifications", { token: officer, body })));
    assert(replies.every((r) => r.consultationId === first.consultationId));
    assert.equal(Number((await admin`SELECT count(*) n FROM registry_consultation WHERE company_id=${companyId}`)[0].n), 1);
    await request("/institution/registry-verifications", { token: officer, body: { ...body, manualResult: { ...manual, sourceRef: "Autre extrait" } }, status: 409 });
  });
  await check("Permissions et historique append-only", async () => {
    await request("/institution/registry-verifications", { token: seller, body, status: 403 });
    await request(`/institution/companies/${companyId}`, { token: outsider, status: 403 });
    await assert.rejects(admin`UPDATE registry_consultation SET outcome='CONFIRMED' WHERE id=${first.consultationId}`);
    await app.begin(async (tx) => { const rows = await tx`SELECT * FROM registry_consultation WHERE company_id=${companyId}`; assert.equal(rows.length, 0); });
  });
  await check("Identité modifiée : prérequis invalidé, historique conservé", async () => {
    await request("/institution/certifications", { token: officer, body: certify(companyId) });
    assert.equal((await request(`/institution/certifications/${companyId}`, { token: officer })).isDealReady, true);
    await admin`UPDATE company SET legal_name='Identité modifiée' WHERE id=${companyId}`;
    assert.equal((await admin`SELECT registry_record_id FROM company WHERE id=${companyId}`)[0].registry_record_id, null);
    await request("/institution/certifications", { token: officer, body: certify(companyId), status: 409 });
    const detail = await request(`/institution/companies/${companyId}`, { token: officer });
    assert.equal(detail.consultationHistory[0].stale, true);
    assert.equal(detail.certification.isDealReady, false);
    assert.equal(detail.history[0].decision, "GRANTED");
    assert.equal((await request(`/institution/certifications/${companyId}`, { token: officer })).isDealReady, false);
    assert.equal(Number((await admin`SELECT count(*) n FROM registry_record WHERE id=${first.registryRecordId}`)[0].n), 1);
  });
  for (const decision of ["DIVERGENT", "NEEDS_INFO", "REFUSED"]) await check(`Instruction manuelle : ${decision} avec motif`, async () => {
    const id = await newCompany(`TG-${decision}`);
    const result = await request("/institution/registry-verifications", { token: officer, body: { ...body, companyId: id, rccmNumber: `TG-${decision}`, requestId: randomUUID(), manualResult: { ...manual, decision, reason: "Pièce à clarifier" } } });
    assert.equal(result.outcome, decision); assert.equal(result.registryRecordId, null);
  });
  const apiPort = await freePort();
  const api = `http://127.0.0.1:${apiPort}/v1`;
  child = spawn(process.execPath, ["dist/main.js"], { cwd: resolve(root, "codebases/backend/api"), env: { ...process.env, API_PORT: String(apiPort), CFE_API_ENABLED: "true", CONNECTOR_REGISTRY_MODE: "api", CFE_API_TIMEOUT_MS: "150" }, stdio: "ignore" });
  let ready = false;
  for (let i = 0; i < 100; i++) { try { ready = (await fetch(`${api}/ready`)).ok; } catch { /* Démarrage en cours. */ } if (ready) break; await delay(100); }
  assert(ready, "API mock démarrée");
  for (const [scenario, outcome] of [["MATCH", "CONFIRMED"], ["ABSENT", "NOT_FOUND"], ["DIVERGENT", "DIVERGENT"], ["STRUCK", "STRUCK_OFF"], ["INCOMPLETE", "INCOMPLETE"], ["MALFORMED", "UNAVAILABLE"], ["429", "UNAVAILABLE"], ["503", "UNAVAILABLE"], ["TIMEOUT", "UNAVAILABLE"]]) {
    await check(`API mock : ${scenario}, provenance et décision séparée`, async () => {
      const rccmNumber = `TG-MOCK-${scenario}`;
      const id = await newCompany(rccmNumber);
      const payload = { companyId: id, rccmNumber, legalForm: "SARL", requestId: randomUUID() };
      const result = await request("/institution/registry-verifications", { token: officer, api, body: payload });
      assert.equal(result.outcome, outcome); assert(result.synthetic); assert.equal(result.registryRecordId, null);
      await request("/institution/certifications", { token: officer, api, body: certify(id), status: 409 });
      const detail = await request(`/institution/companies/${id}`, { token: officer, api });
      assert.equal(detail.consultationHistory[0].provider, "mock");
      if (scenario === "TIMEOUT") {
        assert.equal(detail.consultationHistory[0].reason, "TIMEOUT");
        await request("/institution/registry-verifications", { token: officer, api, body: { ...payload, requestId: randomUUID(), manualResult: manual }, status: 409 });
        const recovered = await request("/institution/registry-verifications", { token: officer, api, body: { ...payload, requestId: randomUUID(), manualResult: { ...manual, reason: "Identité concordante sur extrait consulté" }, fallbackFromId: result.consultationId, fallbackReason: "Extrait consulté après indisponibilité" } });
        assert.equal(recovered.synthetic, false); assert(recovered.registryRecordId);
        const trace = (await admin`SELECT metadata FROM audit_event WHERE metadata->>'consultationId'=${recovered.consultationId}`)[0];
        assert.equal(trace.metadata.fallbackReason, "Extrait consulté après indisponibilité");
        assert.equal(trace.metadata.decisionReason, "Identité concordante sur extrait consulté");
        await request("/institution/certifications", { token: officer, api, body: certify(id) });
        assert.equal((await request(`/institution/companies/${id}`, { token: officer, api })).consultationHistory.length, 2);
      }
    });
  }
  const webPort = await freePort();
  const origin = `http://127.0.0.1:${webPort}`;
  const web = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "start", "-p", String(webPort)], { cwd: resolve(root, "codebases/frontend/web"), env: { ...process.env, NODE_ENV: "production", API_BASE_URL: api }, stdio: "ignore" });
  let browser;
  try {
    for (let i = 0; i < 100; i++) { try { if ((await fetch(`${origin}/connexion`)).ok) break; } catch { /* Démarrage en cours. */ } await delay(100); }
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    await context.addCookies([{ name: "dp_session", value: officer, url: origin, httpOnly: true, sameSite: "Lax" }]);
    const page = await context.newPage();
    const id = await newCompany("TG-MOCK-TIMEOUT");
    await check("Navigateur : panne réseau et reprise du formulaire", async () => {
      await page.goto(`${origin}/cci/entreprises/${id}`);
      await page.route("**/api/institution/registry-verifications", (route) => route.abort());
      await page.locator('[data-control-id="CCI_REGISTRY_SUBMIT"]').click();
      await page.locator('[data-control-id="CCI_REGISTRY_ERROR"]').waitFor();
      assert.equal(await page.locator('[data-control-id="CCI_REGISTRY_SUBMIT"]').isDisabled(), false);
      await page.unroute("**/api/institution/registry-verifications");
    });
    await check("Navigateur : incident API visible, reprise manuelle explicite et historique", async () => {
      await page.locator('[data-control-id="CCI_REGISTRY_SUBMIT"]').click();
      await page.getByText("Incident — à vérifier", { exact: true }).waitFor();
      await page.locator("#fallback").selectOption("manual");
      await page.locator("#fallbackReason").fill("Extrait consulté au guichet après timeout");
      await page.locator("#sourceRef").fill("EXTRAIT-NAVIGATEUR-L04");
      await page.locator('[data-control-id="CCI_REGISTRY_SUBMIT"]').click();
      await page.getByText("Correspondance confirmée", { exact: true }).waitFor();
      assert.equal(await page.locator('[data-control-id="CCI_REGISTRY_HISTORY"] li').count(), 2);
    });
    await check("Navigateur mobile : provenance et formulaire sans débordement", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      assert(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1));
      assert((await page.locator('[data-control-id="CCI_REGISTRY_HISTORY"]').innerText()).includes("SYNTHÉTIQUE"));
      await page.screenshot({ path: resolve(root, ".ci-artifacts/l04-registry-mobile.png"), fullPage: true });
    });
  } finally { await browser?.close(); web.kill("SIGTERM"); }
  assert(me);
  report.status = "PASS";
} catch (error) { console.error(error); report.status = "FAIL"; process.exitCode = 1; }
finally { child?.kill("SIGTERM"); await admin.end({ timeout: 5 }); await app.end({ timeout: 5 }); report.finishedAt = new Date().toISOString(); save(); }
