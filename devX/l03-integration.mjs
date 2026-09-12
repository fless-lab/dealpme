import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { createSmtpAdapter } from "@dealpme/connector-email";
import { createGenericHttpAdapter } from "@dealpme/connector-sms";
import { readOtp, receivedMessage } from "./notification-inbox.mjs";
import { verifyNotificationBrowser } from "./l03-browser.mjs";

if (!/^dealpme-ci-/.test(process.env.CI_TEST_PROJECT ?? "")) throw new Error("Utiliser la pile CI isolée");
const target = new URL(process.env.DATABASE_URL_CORE_ADMIN);
const owner = spawnSync("docker", ["inspect", "--format", '{{ index .Config.Labels "com.docker.compose.project" }}', process.env.SMOKE_CORE_CONTAINER], { encoding: "utf8" });
const mapped = spawnSync("docker", ["port", process.env.SMOKE_CORE_CONTAINER, "5432/tcp"], { encoding: "utf8" });
if (owner.status !== 0 || owner.stdout.trim() !== process.env.CI_TEST_PROJECT || mapped.stdout.trim() !== `127.0.0.1:${target.port}` || target.hostname !== "127.0.0.1" || target.pathname !== "/dealpme_core") throw new Error("Base de test non isolée");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const api = `http://127.0.0.1:${process.env.API_PORT}/v1`;
const admin = postgres(process.env.DATABASE_URL_CORE_ADMIN, { max: 2 });
const credentials = JSON.parse(readFileSync(process.env.DEMO_CREDENTIALS_FILE, "utf8"));
const output = join(root, ".ci-artifacts/l03-results.json");
const report = { startedAt: new Date().toISOString(), status: "RUNNING", checks: [] };
const save = () => writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
async function check(name, work) {
  const result = { name, status: "RUNNING" }; report.checks.push(result); save();
  try { await work(); result.status = "PASS"; console.log(`[L03] OK ${name}`); }
  catch (error) { result.status = "FAIL"; console.error(`[L03] Échec ${name}`, error); throw error; }
  finally { save(); }
}
async function waitFor(work) { const until = Date.now() + 15000; do { if (await work()) return; await delay(100); } while (Date.now() < until); throw new Error("Attente dépassée"); }
async function freePort() {
  const server = createServer(); await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const port = server.address().port; await new Promise((ok) => server.close(ok)); return port;
}
function resetRates() { assert.equal(spawnSync("docker", ["exec", process.env.SMOKE_REDIS_CONTAINER, "redis-cli", "FLUSHDB"]).status, 0); }
async function request(path, body, expected = 200, cid = `l03-${randomUUID()}`, base = api) {
  const response = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-correlation-id": cid }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const data = await response.json(); assert.equal(response.status, expected, path); assert(!("devCode" in data)); return data;
}
const control = async (mode, correlationId, count = 1) => {
  const r = await fetch(`${process.env.SMS_LOCAL_BASE_URL}/test-controls`, { method: "POST", headers: { authorization: `Bearer ${process.env.SMS_LOCAL_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ mode, correlationId, count, delayMs: 3000 }) });
  assert.equal(r.status, 200);
};
const delivery = (cid) => ({ idempotencyKey: randomUUID(), correlationId: cid, expiresAt: new Date(Date.now() + 60000).toISOString() });
const sms = createGenericHttpAdapter({ baseUrl: process.env.SMS_LOCAL_BASE_URL, apiKey: process.env.SMS_LOCAL_API_KEY, local: true });
const smtp = createSmtpAdapter({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT), from: process.env.EMAIL_FROM });
const officerEmail = "officier@cci-togo.demo.dealpme.local";
const loginBody = { email: officerEmail, password: credentials[officerEmail] };
const count = async (query) => Number((await query)[0].n);
const registration = (email) => ({ email, password: "MotDePasse-Test-L03-2026", phoneE164: "+22890000001", organisationName: "L03 synthétique", role: "INVESTOR", consents: { termsAccepted: true, privacyAccepted: true, marketingOptIn: false }, attribution: { channel: "TEST" } });

try {
  resetRates();
  await check("SMTP Mailpit : destinataire, Unicode, HTML et en-têtes reçus", async () => {
    const meta = delivery("l03-email");
    const receipt = await smtp.send({ to: "client-l03@example.test", subject: "Échanges et réception", text: "Bonjour, voici votre récapitulatif.", html: "<p>Échanges <strong>confirmés</strong></p>", category: "TRANSACTIONAL", delivery: meta });
    assert.equal(receipt.status, "ACCEPTED");
    const message = await receivedMessage("email", meta.idempotencyKey);
    assert.equal(message.to[0].Address, "client-l03@example.test");
    assert(message.text.includes("récapitulatif")); assert(message.html.includes("confirmés"));
    assert.equal(message.subject, "Échanges et réception");
  });
  await check("Email marketing : lien de désinscription transmis, absence refusée", async () => {
    const meta = delivery("l03-marketing");
    await smtp.send({ to: "client-l03@example.test", subject: "Lettre de test", text: "Message synthétique de transport.", category: "MARKETING", unsubscribeUrl: "https://example.test/unsubscribe", delivery: meta });
    const message = await receivedMessage("email", meta.idempotencyKey);
    const header = Object.entries(message.headers).find(([key]) => key.toLowerCase() === "list-unsubscribe"); assert(header);
    await assert.rejects(smtp.send({ to: "client-l03@example.test", subject: "Sans lien", text: "Test", category: "MARKETING" }));
  });
  const xss = delivery("l03-box-html");
  await check("SMS : contenu et numéro conservés, Unicode estimé et état explicitement simulé", async () => {
    const text = 'Échange 🙂 <img src=x onerror="globalThis.smsXss=true">';
    const receipt = await sms.send({ toE164: "+22890000001", text, category: "TRANSACTIONAL", delivery: xss });
    assert(receipt.simulated); const message = await receivedMessage("sms", xss.idempotencyKey);
    assert.equal(message.text, text); assert.equal(message.encoding, "UCS-2"); assert.equal(message.toE164, "+22890000001");
  });
  await check("SMS : 429 repris avec la même clé et une seule réception", async () => {
    const meta = delivery("l03-rate"); await control("rate-limit", meta.correlationId);
    const receipt = await sms.send({ toE164: "+22890000001", text: "Reprise limitée", category: "TRANSACTIONAL", delivery: meta });
    assert.equal(receipt.attempts, 2);
    const replay = await sms.send({ toE164: "+22890000001", text: "Reprise limitée", category: "TRANSACTIONAL", delivery: meta });
    assert.equal(receipt.providerRef, replay.providerRef);
  });
  await check("SMS : acceptation suivie d'un timeout sans double message", async () => {
    const meta = delivery("l03-unknown"); await control("accepted-timeout", meta.correlationId);
    const receipt = await sms.send({ toE164: "+22890000001", text: "Résultat rapproché", category: "TRANSACTIONAL", delivery: meta });
    assert.equal(receipt.attempts, 2);
    const result = await (await fetch(`${process.env.SMS_LOCAL_BASE_URL}/messages?idempotencyKey=${meta.idempotencyKey}`)).json();
    assert.equal(result.items.length, 1);
  });
  await check("MFA : aucun code dans l'API, réception par boîte et trace d'acceptation", async () => {
    const cid = "l03-mfa-ok", challenge = await request("/auth/login", loginBody, 200, cid);
    const code = await readOtp("sms", challenge.challengeId);
    assert(!JSON.stringify(challenge).includes('"code":'));
    const audit = (await admin`SELECT metadata FROM audit_event WHERE correlation_id=${cid} AND action='OTP_ISSUED'`)[0];
    assert.equal(audit.metadata.deliveryStatus, "ACCEPTED"); assert.equal(audit.metadata.simulated, true);
    await request("/auth/mfa/verify", { challengeId: challenge.challengeId, code });
    await request("/auth/mfa/verify", { challengeId: challenge.challengeId, code }, 401);
  });
  await check("MFA : indisponibilité SMS annule le défi et laisse une preuve d'échec", async () => {
    const cid = "l03-sms-down"; await control("unavailable", cid, 3);
    const result = await request("/auth/login", loginBody, 503, cid); assert.equal(result.error.code, "NOTIFICATION_UNAVAILABLE");
    const failure = (await admin`SELECT subject_id,metadata FROM audit_event WHERE correlation_id=${cid} AND action='OTP_DELIVERY_FAILED'`)[0];
    assert(failure); assert.equal(failure.metadata.transportCode, "UNAVAILABLE");
    assert.equal(await count(admin`SELECT count(*) n FROM otp_challenge WHERE id=${failure.subject_id}`), 0);
    assert.equal(await count(admin`SELECT count(*) n FROM audit_event WHERE correlation_id=${cid} AND action='OTP_ISSUED'`), 0);
  });
  await check("MFA : refus permanent du destinataire sans faux succès", async () => {
    const cid = "l03-rejected"; await control("reject", cid);
    const result = await request("/auth/login", loginBody, 400, cid); assert.equal(result.error.details.reason, "RECIPIENT_REJECTED");
  });
  await check("OTP : expiration et cinq erreurs restent appliquées avec le transport local", async () => {
    const challenge = await request("/auth/login", loginBody);
    const code = await readOtp("sms", challenge.challengeId);
    await admin`UPDATE otp_challenge SET expires_at=now()-interval '1 second' WHERE id=${challenge.challengeId}`;
    await request("/auth/mfa/verify", { challengeId: challenge.challengeId, code }, 401);
    const next = await request("/auth/login", loginBody), received = await readOtp("sms", next.challengeId);
    const wrong = received === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await request("/auth/mfa/verify", { challengeId: next.challengeId, code: wrong }, 401);
    await request("/auth/mfa/verify", { challengeId: next.challengeId, code: received }, 429);
  });
  resetRates();
  await check("Émissions OTP limitées par utilisateur", async () => {
    for (let i = 0; i < 5; i++) await request("/auth/login", loginBody);
    await request("/auth/login", loginBody, 429);
  });
  resetRates();
  await check("Email perdu ou expiré : la connexion propose un nouveau défi, sans session", async () => {
    const email = `l03-renew-${randomUUID()}@demo.dealpme.local`;
    const reg = await request("/auth/register", registration(email), 201);
    await admin`UPDATE otp_challenge SET expires_at=now()-interval '1 second' WHERE id=${reg.emailChallengeId}`;
    const denied = await request("/auth/login", { email, password: registration(email).password }, 403);
    const id = denied.error.details.challengeId; assert(id && id !== reg.emailChallengeId);
    await request("/auth/email/verify", { challengeId: id, code: await readOtp("email", id) });
  });
  await check("Panne SMTP : inscription annulée et tentative d'envoi tracée", async () => {
    const refused = createServer((socket) => socket.destroy()); await new Promise((ok) => refused.listen(0, "127.0.0.1", ok));
    const apiPort = await freePort();
    const child = spawn(process.execPath, ["dist/main.js"], { cwd: join(root, "codebases/backend/api"), env: { ...process.env, API_PORT: String(apiPort), SMTP_PORT: String(refused.address().port) }, stdio: "ignore" });
    try {
      await waitFor(async () => { try { return (await fetch(`http://127.0.0.1:${apiPort}/v1/ready`)).ok; } catch { return false; } });
      const email = `l03-fail-${randomUUID()}@demo.dealpme.local`;
      await request("/auth/register", registration(email), 503, "l03-smtp-down", `http://127.0.0.1:${apiPort}/v1`);
      assert.equal(await count(admin`SELECT count(*) n FROM app_user WHERE email=${email}`), 0);
      assert.equal(await count(admin`SELECT count(*) n FROM audit_event WHERE correlation_id='l03-smtp-down' AND action='OTP_DELIVERY_FAILED'`), 1);
    } finally { child.kill("SIGKILL"); await new Promise((ok) => refused.close(ok)); }
  });
  await check("Démarrage production : refus des fournisseurs locaux", async () => {
    const result = spawnSync(process.execPath, ["dist/main.js"], { cwd: join(root, "codebases/backend/api"), env: { ...process.env, NODE_ENV: "production", API_PORT: String(await freePort()) }, encoding: "utf8", timeout: 10000 });
    assert.equal(result.status, 1); assert(`${result.stdout}${result.stderr}`.includes("SMTP réel requis en production"));
  });
  resetRates();
  await verifyNotificationBrowser({ check, root, api, freePort, waitFor, credentials, xssKey: xss.idempotencyKey });
  report.status = "PASS";
} catch (error) { console.error("[L03] Diagnostic privé", error); report.status = "FAIL"; process.exitCode = 1; }
finally {
  await control("none", "").catch(() => {});
  await admin.end({ timeout: 5 });
  report.finishedAt = new Date().toISOString(); save();
  console.log(`[L03] ${report.status} — ${report.checks.length} scénarios locaux ; opérateur réel non qualifié`);
}
