import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { verifyHistoricalMigration } from "./l02-migration-check.mjs";
import { verifyMessagingBrowser } from "./l02-browser.mjs";
import { readOtp } from "./notification-inbox.mjs";

// Les injections de panne ne sont utilisables que dans la pile jetable du runner CI.
if (!/^dealpme-ci-/.test(process.env.CI_TEST_PROJECT ?? "") || !process.env.DEMO_CREDENTIALS_FILE) throw new Error("Utiliser npm run ci:smoke, jamais la base de travail");
const target = new URL(process.env.DATABASE_URL_CORE_ADMIN);
const owner = spawnSync("docker", ["inspect", "--format", '{{ index .Config.Labels "com.docker.compose.project" }}', process.env.SMOKE_CORE_CONTAINER], { encoding: "utf8" });
const port = spawnSync("docker", ["port", process.env.SMOKE_CORE_CONTAINER, "5432/tcp"], { encoding: "utf8" });
if (owner.status !== 0 || owner.stdout.trim() !== process.env.CI_TEST_PROJECT || port.status !== 0 || port.stdout.trim() !== `127.0.0.1:${target.port}` || target.hostname !== "127.0.0.1" || target.pathname !== "/dealpme_core") {
  throw new Error("La base cible ne correspond pas au conteneur PostgreSQL jetable de cette exécution");
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = `http://127.0.0.1:${process.env.API_PORT}/v1`;
const admin = postgres(process.env.DATABASE_URL_CORE_ADMIN, { max: 3, onnotice: () => {} });
const credentials = JSON.parse(readFileSync(process.env.DEMO_CREDENTIALS_FILE, "utf8"));
const report = { startedAt: new Date().toISOString(), status: "RUNNING", checks: [] };
const output = join(root, ".ci-artifacts/l02-results.json");
const save = () => writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
async function check(name, work) {
  const result = { name, status: "RUNNING" }; report.checks.push(result); save();
  try { await work(); result.status = "PASS"; console.log(`[L02] OK ${name}`); }
  catch (error) { result.status = "FAIL"; console.error(`[L02] Échec ${name}`, error); throw error; }
  finally { save(); }
}
async function request(path, { token, body, method = body === undefined ? "GET" : "POST", status = 200, cid = `l02-${randomUUID()}`, headers = {}, api = base } = {}) {
  const res = await fetch(`${api}${path}`, { method, headers: { "content-type": "application/json", "x-correlation-id": cid, ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  const data = await res.json().catch(() => null);
  assert.equal(res.status, status, `${method} ${path}`);
  return data;
}
async function login(email) {
  const data = await request("/auth/login", { body: { email, password: credentials[email] } });
  if (data.mfaRequired) return (await request("/auth/mfa/verify", { body: { challengeId: data.challengeId, code: await readOtp("sms", data.challengeId) } })).token;
  return data.token;
}
const scalar = async (query) => Number((await query)[0].n);
async function waitFor(work, timeout = 15000) {
  const until = Date.now() + timeout;
  do { if (await work()) return; await delay(100); } while (Date.now() < until);
  throw new Error("Délai du test dépassé");
}
async function freePort() {
  const server = createServer();
  await new Promise((ok, fail) => { server.once("error", fail); server.listen(0, "127.0.0.1", ok); });
  const port = server.address().port;
  await new Promise((ok) => server.close(ok));
  return port;
}

try {
  const reset = spawnSync("docker", ["exec", process.env.SMOKE_REDIS_CONTAINER, "redis-cli", "FLUSHDB"], { encoding: "utf8" });
  assert.equal(reset.status, 0);
  await admin.unsafe(`CREATE FUNCTION l02_audit_fault() RETURNS trigger AS $$ BEGIN
    IF NEW.correlation_id LIKE 'l02-fault-%' THEN RAISE EXCEPTION 'injection L02'; END IF;
    IF NEW.correlation_id = 'l02-otp-only' AND NEW.action = 'OTP_ISSUED' THEN RAISE EXCEPTION 'injection OTP L02'; END IF;
    IF NEW.correlation_id = 'l02-pause' THEN PERFORM pg_advisory_xact_lock(912026); PERFORM pg_sleep(20); END IF;
    RETURN NEW; END $$ LANGUAGE plpgsql;
    CREATE TRIGGER l02_audit_fault AFTER INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION l02_audit_fault();`);
  await check("Migration historique : aucun contenu perdu et aucune attribution arbitraire", () => verifyHistoricalMigration(admin, root));
  const seller = await login("cedant.froidroute@demo.dealpme.local");
  const investorA = await login("investisseur@demo.dealpme.local");
  const officer = await login("officier@cci-togo.demo.dealpme.local");
  const outsider = await login("cedant.tropicvale@demo.dealpme.local");
  const meA = await request("/me", { token: investorA });
  const sellerMe = await request("/me", { token: seller });
  const deal = (await admin`SELECT d.* FROM deal d JOIN company c ON c.id=d.company_id WHERE c.legal_name LIKE 'FroidRoute%' LIMIT 1`)[0];
  const faultEmail = `l02-fault-${randomUUID()}@demo.dealpme.local`;
  const registration = (email) => ({ email, password: "MotDePasse-Test-L02-2026", phoneE164: "+22890000001", organisationName: "L02 synthétique", role: "INVESTOR", consents: { termsAccepted: true, privacyAccepted: true, marketingOptIn: false }, attribution: { channel: "TEST" } });
  await check("Inscription : panne audit annule utilisateur, organisation et preuve", async () => {
    const before = await scalar(admin`SELECT count(*) n FROM organisation`);
    await request("/auth/register", { body: registration(faultEmail), cid: "l02-fault-register", status: 500 });
    assert.equal(await scalar(admin`SELECT count(*) n FROM app_user WHERE email=${faultEmail}`), 0);
    assert.equal(await scalar(admin`SELECT count(*) n FROM organisation`), before);
    assert.equal(await scalar(admin`SELECT count(*) n FROM audit_event WHERE correlation_id='l02-fault-register'`), 0);
  });
  await check("Échec de la preuve OTP : inscription entière annulée, même après USER_REGISTERED", async () => {
    const email = `otp-only-${randomUUID()}@demo.dealpme.local`;
    const before = await scalar(admin`SELECT count(*) n FROM organisation`);
    await request("/auth/register", { body: registration(email), cid: "l02-otp-only", status: 500 });
    assert.equal(await scalar(admin`SELECT count(*) n FROM app_user WHERE email=${email}`), 0);
    assert.equal(await scalar(admin`SELECT count(*) n FROM organisation`), before);
    assert.equal(await scalar(admin`SELECT count(*) n FROM audit_event WHERE correlation_id='l02-otp-only'`), 0);
  });
  const emailB = `l02-beta-${randomUUID()}@demo.dealpme.local`;
  const registrationB = await request("/auth/register", { body: registration(emailB), status: 201 });
  const registrationBCode = await readOtp("email", registrationB.emailChallengeId);
  await check("Email : consommation OTP et validation annulées ensemble si audit échoue", async () => {
    await request("/auth/email/verify", { body: { challengeId: registrationB.emailChallengeId, code: registrationBCode }, cid: "l02-fault-email", status: 500 });
    assert.equal((await admin`SELECT consumed_at FROM otp_challenge WHERE id=${registrationB.emailChallengeId}`)[0].consumed_at, null);
    assert.equal((await admin`SELECT email_verified_at FROM app_user WHERE email=${emailB}`)[0].email_verified_at, null);
    await request("/auth/email/verify", { body: { challengeId: registrationB.emailChallengeId, code: registrationBCode } });
  });
  const investorB = (await request("/auth/login", { body: { email: emailB, password: registration(emailB).password } })).token;
  const meB = await request("/me", { token: investorB });
  await check("Connexion : aucune session créée sans audit durable", async () => {
    const before = await scalar(admin`SELECT count(*) n FROM session WHERE user_id=${meA.id ?? meA.userId}`);
    await request("/auth/login", { body: { email: "investisseur@demo.dealpme.local", password: credentials["investisseur@demo.dealpme.local"] }, cid: "l02-fault-login", status: 500 });
    assert.equal(await scalar(admin`SELECT count(*) n FROM session WHERE user_id=${meA.id ?? meA.userId}`), before);
  });
  await check("Refus de connexion enregistré avant la réponse et conservé", async () => {
    await request("/auth/login", { body: { email: "absent@demo.dealpme.local", password: "incorrect" }, cid: "l02-login-denied", status: 401 });
    assert.equal(await scalar(admin`SELECT count(*) n FROM audit_event WHERE correlation_id='l02-login-denied' AND action='LOGIN_FAILED'`), 1);
  });
  await check("MFA : consommation unique en concurrence et pas de session sans preuve", async () => {
    const challenge = await request("/auth/login", { body: { email: "officier@cci-togo.demo.dealpme.local", password: credentials["officier@cci-togo.demo.dealpme.local"] } });
    const challengeCode = await readOtp("sms", challenge.challengeId);
    await request("/auth/mfa/verify", { body: { challengeId: challenge.challengeId, code: challengeCode }, cid: "l02-fault-mfa", status: 500 });
    assert.equal((await admin`SELECT consumed_at FROM otp_challenge WHERE id=${challenge.challengeId}`)[0].consumed_at, null);
    const responses = await Promise.all([1, 2].map(() => fetch(`${base}/auth/mfa/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ challengeId: challenge.challengeId, code: challengeCode }) })));
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 401]);
    await Promise.all(responses.map((r) => r.arrayBuffer()));
  });
  await check("Révocation de session annulée si audit indisponible", async () => {
    const token = await login("investisseur@demo.dealpme.local");
    await request("/auth/sessions/logout", { token, method: "POST", cid: "l02-fault-revoke", status: 500 });
    await request("/me", { token });
  });
  await check("Entreprise : panne audit ne laisse aucune création", async () => {
    await request("/companies", { token: seller, body: { legalName: "L02 rollback entreprise", legalForm: "SARL" }, cid: "l02-fault-company", status: 500 });
    assert.equal(await scalar(admin`SELECT count(*) n FROM company WHERE legal_name='L02 rollback entreprise'`), 0);
  });
  const company = await request("/companies", { token: seller, body: { legalName: "L02 entreprise", legalForm: "SARL", rccmNumber: "TG-L02-TEST" }, status: 201 });
  const makeDeal = { companyId: company.companyId, dealType: "ASSET_DEAL", sectorCode: "TEST", regionCode: "KARA", turnoverBand: "LT_50M" };
  await check("Dossier : création et DealEvent annulés sur panne d'audit", async () => {
    await request("/deals", { token: seller, body: makeDeal, cid: "l02-fault-deal", status: 500 });
    assert.equal(await scalar(admin`SELECT count(*) n FROM deal WHERE company_id=${company.companyId}`), 0);
  });
  const draft = await request("/deals", { token: seller, body: makeDeal, status: 201 });
  await check("Pièce déposée : panne audit annule la métadonnée de publication", async () => {
    const form = new FormData();
    form.set("category", "STATUTS"); form.set("title", "Pièce L02 annulée");
    form.set("file", new Blob(["%PDF-1.4\nL02\n%%EOF\n"], { type: "application/pdf" }), "l02.pdf");
    const response = await fetch(`${base}/deals/${draft.dealId}/dossier/documents`, { method: "POST", headers: { authorization: `Bearer ${seller}`, "x-correlation-id": "l02-fault-upload" }, body: form });
    assert.equal(response.status, 500); await response.arrayBuffer();
    assert.equal(await scalar(admin`SELECT count(*) n FROM deal_document WHERE deal_id=${draft.dealId}`), 0);
  });
  await check("Événement et alerte : écritures annulées si leur preuve échoue", async () => {
    await request("/events", { token: officer, body: { title: "Événement L02 annulé", startsAt: "2026-10-01T09:00:00Z", endsAt: "2026-10-01T12:00:00Z", capacity: 10 }, cid: "l02-fault-event", status: 500 });
    await request("/alerts", { token: investorA, body: { label: "Alerte L02 annulée" }, cid: "l02-fault-alert", status: 500 });
    assert.equal(await scalar(admin`SELECT count(*) n FROM event WHERE title='Événement L02 annulé'`), 0);
    assert.equal(await scalar(admin`SELECT count(*) n FROM saved_alert WHERE label='Alerte L02 annulée'`), 0);
  });
  await check("Valeur déclarée : version précédente intacte après échec", async () => {
    await request(`/deals/${draft.dealId}/dossier/facts`, { token: seller, body: { fieldKey: "ACTIVITY_DESCRIPTION", valueText: "Version initiale" }, status: 201 });
    await request(`/deals/${draft.dealId}/dossier/facts`, { token: seller, body: { fieldKey: "ACTIVITY_DESCRIPTION", valueText: "Version refusée" }, cid: "l02-fault-fact", status: 500 });
    const facts = await admin`SELECT * FROM declared_fact WHERE deal_id=${draft.dealId}`;
    assert.equal(facts.length, 1); assert.equal(facts[0].superseded_at, null);
  });
  await check("Certification et clôture de demande atomiques", async () => {
    await request("/institution/registry-verifications", { token: officer, body: { companyId: company.companyId, rccmNumber: "TG-L02-TEST", legalForm: "SARL", manualResult: { legalName: "L02 entreprise", legalForm: "SARL", status: "ACTIVE", sourceRef: "L02" } }, status: 201 });
    const reqId = randomUUID();
    await admin`INSERT INTO certification_request(id,company_id,requested_by) VALUES(${reqId},${company.companyId},${sellerMe.id ?? sellerMe.userId})`;
    const body = { companyId: company.companyId, decision: "GRANTED", scopeStatement: "Existence et complétude documentaire vérifiées, aucune garantie financière.", conflictOfInterestDeclared: false };
    await request("/institution/certifications", { token: officer, body, cid: "l02-fault-cert", status: 500 });
    assert.equal(await scalar(admin`SELECT count(*) n FROM certification WHERE company_id=${company.companyId}`), 0);
    assert.equal((await admin`SELECT state FROM certification_request WHERE id=${reqId}`)[0].state, "REQUESTED");
    await request("/institution/certifications", { token: officer, body, status: 201 });
    assert.equal((await admin`SELECT state FROM certification_request WHERE id=${reqId}`)[0].state, "DECIDED");
  });
  let convA, convB;
  await check("Intérêts concurrents : un seul fil par organisation", async () => {
    const outcomes = await Promise.all(Array.from({ length: 6 }, () => request(`/deals/${deal.id}/interests`, { token: investorA, body: { message: "Intérêt Alpha" }, status: 201 })));
    assert.equal(new Set(outcomes.map((r) => r.conversationId)).size, 1);
    convA = outcomes[0].conversationId;
    convB = (await request(`/deals/${deal.id}/interests`, { token: investorB, body: { message: "Intérêt Beta" }, status: 201 })).conversationId;
    assert.notEqual(convA, convB);
  });
  await check("Panne audit : ni message ni succès fantôme", async () => {
    await request(`/deals/${deal.id}/messages`, { token: investorA, body: { body: "Message annulé L02" }, cid: "l02-fault-message", status: 500 });
    assert.equal(await scalar(admin`SELECT count(*) n FROM deal_message WHERE body='Message annulé L02'`), 0);
  });
  await check("Échange A/cédant isolé de B, identifiants serveur et aucune identité T0", async () => {
    await request(`/deals/${deal.id}/messages`, { token: investorA, body: { body: "Question Alpha L02" }, status: 201 });
    await request(`/deals/${deal.id}/messages`, { token: investorB, body: { body: "Question Beta L02" }, status: 201 });
    const sent = await request(`/deals/${deal.id}/messages`, { token: seller, body: { body: "Réponse réservée Alpha L02", conversationId: convA }, status: 201 });
    const a = await request(`/deals/${deal.id}/messages`, { token: investorA });
    const b = await request(`/deals/${deal.id}/messages`, { token: investorB });
    assert(a.items.some((m) => m.id === sent.messageId && !m.mine));
    assert(!a.items.some((m) => m.body.includes("Beta L02")));
    assert(!b.items.some((m) => m.body.includes("Alpha L02")));
    assert(a.items.every((m) => Object.keys(m).sort().join() === ["id", "conversationId", "body", "createdAt", "mine"].sort().join()));
  });
  await check("Cible obligatoire pour le cédant, refus des fils étrangers et pièces jointes", async () => {
    await request(`/deals/${deal.id}/messages`, { token: seller, body: { body: "Sans destinataire" }, status: 400 });
    await request(`/deals/${deal.id}/messages`, { token: investorA, body: { body: "Tentative croisée", conversationId: convB }, status: 404 });
    await request(`/deals/${deal.id}/messages?conversationId=${convB}`, { token: investorA, status: 404 });
    await request(`/deals/${draft.dealId}/messages`, { token: seller, body: { body: "Autre dossier", conversationId: convA }, status: 404 });
    await request(`/deals/${deal.id}/messages?conversationId=${convA}`, { token: outsider, status: 404 });
    await request(`/deals/${deal.id}/messages`, { token: investorA, body: { body: "Pièce interdite", attachments: ["piece.pdf"] }, status: 400 });
  });
  await check("Refus concurrents : audit durable après rollback sans saturer le pool", async () => {
    await Promise.all(Array.from({ length: 12 }, (_, i) => request(`/deals/${deal.id}/messages`, { token: investorA, body: { body: "Appelez au +22890112233" }, cid: `l02-denied-${i}`, status: 400 })));
    assert.equal(await scalar(admin`SELECT count(*) n FROM audit_event WHERE correlation_id LIKE 'l02-denied-%' AND action='MESSAGE_BLOCKED'`), 12);
  });
  await check("Audit de refus indisponible : erreur explicite, aucun message enregistré", async () => {
    await request(`/deals/${deal.id}/messages`, { token: investorA, body: { body: "Appelez au +22890112233" }, cid: "l02-fault-rejection", status: 500 });
    assert.equal(await scalar(admin`SELECT count(*) n FROM audit_event WHERE correlation_id='l02-fault-rejection'`), 0);
  });
  await check("Pagination bornée et stable par conversation", async () => {
    const first = await request(`/deals/${deal.id}/messages?limit=2`, { token: investorA });
    assert.equal(first.items.length, 2); assert(first.nextCursor);
    const older = await request(`/deals/${deal.id}/messages?limit=2&before=${first.nextCursor}`, { token: investorA });
    assert(older.items.every((m) => m.conversationId === convA && !first.items.some((n) => n.id === m.id)));
  });
  await check("RLS et contraintes : aucun auteur forgé, fil déplacé ou nouveau message ambigu", async () => {
    const asA = (work) => admin.begin(async (tx) => {
      await tx`SET LOCAL ROLE dealpme_api`;
      await tx`SELECT set_config('app.organisation_id',${meA.organisationId},true),set_config('app.user_id',${meA.id ?? meA.userId},true)`;
      return work(tx);
    });
    assert.equal((await asA((tx) => tx`SELECT * FROM deal_message WHERE conversation_id=${convB}`)).length, 0);
    await assert.rejects(asA((tx) => tx`INSERT INTO deal_message(id,deal_id,conversation_id,sender_user_id,sender_organisation_id,body) VALUES(${randomUUID()},${deal.id},${convA},${meB.id ?? meB.userId},${meA.organisationId},'Auteur forgé')`));
    await assert.rejects(asA((tx) => tx`INSERT INTO deal_message(id,deal_id,sender_user_id,sender_organisation_id,body) VALUES(${randomUUID()},${deal.id},${meA.id ?? meA.userId},${meA.organisationId},'Sans cible')`));
    await assert.rejects(admin`UPDATE deal_conversation SET investor_organisation_id=${meB.organisationId} WHERE id=${convA}`);
    await assert.rejects(admin`UPDATE audit_event SET outcome='FAKE' WHERE correlation_id='l02-login-denied'`);
  });
  const webhook = async (key, subject, { invalid = false, cid, status = 202 } = {}) => {
    const body = { events: [{ remoEventId: subject, externalUserId: "L02", joinedAt: "2026-09-12T00:00:00Z" }] };
    const signature = createHmac("sha256", process.env.CONNECTOR_REMO_WEBHOOK_SECRET).update(JSON.stringify(body)).digest("hex");
    return request("/webhooks/remo/attendance", { body, cid, status, headers: { "idempotency-key": key, "x-remo-signature": invalid ? "deadbeef" : signature } });
  };
  await check("Webhook : rejeu concurrent unique, signature avant cache et empreinte du corps", async () => {
    await Promise.all(Array.from({ length: 4 }, () => webhook("l02-replay", "l02-replay")));
    assert.equal(await scalar(admin`SELECT count(*) n FROM audit_event WHERE subject_id='l02-replay'`), 1);
    await webhook("l02-replay", "l02-replay", { invalid: true, status: 403 });
    await webhook("l02-replay", "l02-other", { status: 409 });
  });
  await check("Webhook : panne audit ne persiste ni effets ni clé ; reprise possible", async () => {
    await webhook("l02-rollback", "l02-rollback", { cid: "l02-fault-webhook", status: 500 });
    assert.equal(await scalar(admin`SELECT count(*) n FROM audit_event WHERE subject_id='l02-rollback'`), 0);
    assert.equal(await scalar(admin`SELECT count(*) n FROM idempotency_key WHERE key LIKE '%:l02-rollback'`), 0);
    await webhook("l02-rollback", "l02-rollback");
    assert.equal(await scalar(admin`SELECT count(*) n FROM audit_event WHERE subject_id='l02-rollback'`), 1);
  });
  await check("Arrêt brutal du processus API avant commit : ni métier ni audit orphelin", async () => {
    const port = await freePort();
    const child = spawn(process.execPath, ["dist/main.js"], { cwd: join(root, "codebases/backend/api"), env: { ...process.env, API_PORT: String(port) }, stdio: "ignore" });
    try {
      await waitFor(async () => { try { return (await fetch(`http://127.0.0.1:${port}/v1/ready`)).ok; } catch { return false; } });
      const pending = fetch(`http://127.0.0.1:${port}/v1/companies`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${seller}`, "x-correlation-id": "l02-pause" }, body: JSON.stringify({ legalName: "L02 arrêt brutal", legalForm: "SARL" }) }).catch(() => null);
      await waitFor(async () => (await admin`SELECT 1 FROM pg_locks WHERE locktype='advisory' AND objid=912026 AND granted`).length > 0);
      child.kill("SIGKILL");
      await pending;
      await waitFor(async () => !(await admin`SELECT 1 FROM pg_locks WHERE locktype='advisory' AND objid=912026 AND granted`).length, 25000);
      assert.equal(await scalar(admin`SELECT count(*) n FROM company WHERE legal_name='L02 arrêt brutal'`), 0);
      assert.equal(await scalar(admin`SELECT count(*) n FROM audit_event WHERE correlation_id='l02-pause'`), 0);
    } finally { child.kill("SIGKILL"); }
  });
  await check("Échec de persistance de la clé webhook : audit et effet annulés ensemble", async () => {
    await admin.unsafe(`CREATE FUNCTION l02_cache_fault() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'injection cache L02'; END $$ LANGUAGE plpgsql;
      CREATE TRIGGER l02_cache_fault AFTER INSERT ON idempotency_key FOR EACH ROW EXECUTE FUNCTION l02_cache_fault();`);
    try {
      await webhook("l02-cache-fault", "l02-cache-fault", { status: 500 });
      assert.equal(await scalar(admin`SELECT count(*) n FROM audit_event WHERE subject_id='l02-cache-fault'`), 0);
      assert.equal(await scalar(admin`SELECT count(*) n FROM idempotency_key WHERE key LIKE '%:l02-cache-fault'`), 0);
    } finally { await admin.unsafe("DROP TRIGGER l02_cache_fault ON idempotency_key; DROP FUNCTION l02_cache_fault()"); }
    await webhook("l02-cache-fault", "l02-cache-fault");
  });
  await check("Ancienne réponse sans empreinte : conservée, mais jamais rejouée sans vérification", async () => {
    const previous = (await admin`SELECT key FROM idempotency_key WHERE key LIKE '%:l02-replay'`)[0].key;
    const key = previous.replace(/l02-replay$/, "l02-legacy-cache");
    await admin`INSERT INTO idempotency_key(key,response_status,response_body) VALUES(${key},202,${admin.json({ received: 999 })})`;
    await webhook("l02-legacy-cache", "l02-legacy-cache", { status: 409 });
    assert.equal((await admin`SELECT response_body FROM idempotency_key WHERE key=${key}`)[0].response_body.received, 999);
  });
  await verifyMessagingBrowser({ check, root, base, freePort, waitFor, seller, investorA, investorB, dealId: deal.id, convA, convB });
  report.status = "PASS";
} catch (error) {
  console.error("[L02] Diagnostic privé", error);
  report.status = "FAIL"; process.exitCode = 1;
} finally {
  await admin.unsafe("DROP TRIGGER IF EXISTS l02_audit_fault ON audit_event; DROP FUNCTION IF EXISTS l02_audit_fault()");
  await admin.end({ timeout: 5 });
  report.finishedAt = new Date().toISOString(); save();
  console.log(`[L02] ${report.status} — ${report.checks.length} scénarios`);
}
