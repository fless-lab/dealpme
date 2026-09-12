import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import { createSmtpAdapter } from "@dealpme/connector-email";
import { TransportError } from "@dealpme/notifications";
import { AlertWorker } from "../codebases/backend/worker/dist/alerts.js";
import { receivedMessage } from "./notification-inbox.mjs";
import { setTimeout as delay } from "node:timers/promises";

if (!/^dealpme-ci-/.test(process.env.CI_TEST_PROJECT ?? "")) throw new Error("Pile CI isolée requise");
const label = spawnSync("docker", ["inspect", "--format", '{{ index .Config.Labels "com.docker.compose.project" }}', process.env.SMOKE_CORE_CONTAINER], { encoding: "utf8" });
assert.equal(label.stdout.trim(), process.env.CI_TEST_PROJECT);
const mapped = spawnSync("docker", ["port", process.env.SMOKE_CORE_CONTAINER, "5432/tcp"], { encoding: "utf8" });
assert.equal(mapped.stdout.trim(), `127.0.0.1:${new URL(process.env.DATABASE_URL_CORE_ADMIN).port}`);
const admin = postgres(process.env.DATABASE_URL_CORE_ADMIN, { max: 3 });
const smtp = createSmtpAdapter({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT), from: process.env.EMAIL_FROM });
const worker = new AlertWorker(process.env.DATABASE_URL_WORKER, smtp, "http://localhost:3000");
const workers = [worker];
const report = { status: "RUNNING", checks: [] };
const save = () => writeFileSync(new URL("../.ci-artifacts/l04-alert-results.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
async function check(name, work) { const row = { name, status: "RUNNING" }; report.checks.push(row); try { await work(); row.status = "PASS"; console.log(`[L04 alertes] OK ${name}`); } catch (error) { row.status = "FAIL"; throw error; } finally { save(); } }
const api = `http://127.0.0.1:${process.env.API_PORT}/v1`;
async function request(path, token, body, status = 201) {
  const response = await fetch(api + path, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const data = await response.json(); assert.equal(response.status, status, JSON.stringify(data)); return data;
}
try {
  assert.equal(spawnSync("docker", ["exec", process.env.SMOKE_REDIS_CONTAINER, "redis-cli", "FLUSHDB"]).status, 0);
  const email = "investisseur@demo.dealpme.local";
  const credentials = JSON.parse(readFileSync(process.env.DEMO_CREDENTIALS_FILE, "utf8"));
  const token = (await request("/auth/login", null, { email, password: credentials[email] }, 200)).token;
  const user = (await admin`SELECT id,organisation_id,roles FROM app_user WHERE email=${email}`)[0];
  const company = (await admin`SELECT id,owner_organisation_id FROM company WHERE owner_organisation_id<>${user.organisation_id} LIMIT 1`)[0];
  await admin`UPDATE saved_alert SET notify_opt_in=false`;
  const dealId = randomUUID();
  await admin`INSERT INTO deal(id,company_id,seller_organisation_id,deal_type,status,visibility,sector_code,region_code,turnover_band)
    VALUES(${dealId},${company.id},${company.owner_organisation_id},'ASSET_DEAL','LISTED_OPEN','OPEN','L04-ALERT','KARA','LT_50M')`;
  const alert = async (optIn = true) => (await request("/alerts", token, { label: "L04 alerte de recette", sectorCode: "L04-ALERT", notifyOptIn: optIn })).alertId;
  const row = async (id) => (await admin`SELECT * FROM notification_intent WHERE alert_id=${id}`)[0];
  const matchAll = async () => { await worker.matchBatch(); await worker.matchBatch(); };
  await check("Rôle worker : prix, identité entreprise et mots de passe inaccessibles", async () => {
    await assert.rejects(worker.db`SELECT asking_price_enc FROM deal`);
    await assert.rejects(worker.db`SELECT legal_name FROM company`);
    await assert.rejects(worker.db`SELECT password_hash FROM app_user`);
  });
  await check("Sans opt-in : aucune intention ; opt-in explicite : matching T0 explicable", async () => {
    const id = await alert(false); await matchAll(); assert.equal(await row(id), undefined);
    await request(`/alerts/${id}/opt-in`, token, { notifyOptIn: true }, 200); await matchAll();
    const intent = await row(id); assert.equal(intent.score, 100); assert(intent.reasons.length >= 4); assert.equal(intent.state, "PENDING");
    await worker.deliverOne(); const sent = await row(id); assert.equal(sent.state, "SENT");
    const received = await receivedMessage("email", sent.id);
    assert.equal(received.to[0].Address, email); assert(received.text.includes(dealId));
    assert(!received.text.includes(company.id)); assert(!received.text.includes("askingPrice"));
  });
  await check("Rejeu et deux workers : une intention et une acceptation SMTP", async () => {
    const id = await alert(); const second = new AlertWorker(process.env.DATABASE_URL_WORKER, smtp, "http://localhost:3000"); workers.push(second);
    await Promise.all([matchAll(), second.matchBatch()]);
    await Promise.all([worker.deliverOne(), second.deliverOne()]);
    assert.equal((await row(id)).attempts, 1); assert.equal((await row(id)).state, "SENT");
    assert.equal(Number((await admin`SELECT count(*) n FROM notification_intent WHERE alert_id=${id}`)[0].n), 1);
  });
  await check("Retrait du consentement après mise en file : transport annulé", async () => {
    const id = await alert(); await matchAll();
    await request(`/alerts/${id}/opt-in`, token, { notifyOptIn: false }, 200);
    await worker.deliverOne(); assert.equal((await row(id)).state, "CANCELLED");
  });
  await check("Dossier retiré après matching : aucun envoi", async () => {
    const id = await alert(); await matchAll(); await admin`UPDATE deal SET visibility='CLOSED' WHERE id=${dealId}`;
    await worker.deliverOne(); assert.equal((await row(id)).state, "CANCELLED");
    await admin`UPDATE deal SET visibility='OPEN' WHERE id=${dealId}`;
  });
  await check("Rôle révoqué après matching : aucun envoi", async () => {
    const id = await alert(); await matchAll(); await admin`UPDATE app_user SET roles='["SELLER"]' WHERE id=${user.id}`;
    await worker.deliverOne(); assert.equal((await row(id)).state, "CANCELLED");
    await admin`UPDATE app_user SET roles=${admin.json(user.roles)} WHERE id=${user.id}`;
  });
  await check("Erreur temporaire : reprise bornée avec la même intention", async () => {
    const id = await alert(); await matchAll();
    const failing = new AlertWorker(process.env.DATABASE_URL_WORKER, { send: async () => { throw new TransportError("UNAVAILABLE", true); } }, "http://localhost:3000"); workers.push(failing);
    await failing.deliverOne(); assert.equal((await row(id)).state, "RETRY");
    await admin`UPDATE notification_intent SET next_attempt_at=now() WHERE alert_id=${id}`;
    await worker.deliverOne(); assert.equal((await row(id)).state, "SENT"); assert.equal((await row(id)).attempts, 2);
  });
  await check("Échec après acceptation SMTP : état inconnu sans double émission", async () => {
    const id = await alert(); await matchAll();
    await admin.unsafe(`CREATE FUNCTION l04_audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.action='ALERT_DELIVERY' AND NEW.metadata->>'phase'='SENT' THEN RAISE EXCEPTION 'test après SMTP'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER l04_audit_fault BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION l04_audit_fault();`);
    try { await assert.rejects(worker.deliverOne()); } finally { await admin.unsafe("DROP TRIGGER l04_audit_fault ON audit_event; DROP FUNCTION l04_audit_fault();"); }
    const pending = await row(id); assert.equal(pending.state, "SENDING"); await receivedMessage("email", pending.id);
    await admin`UPDATE notification_intent SET lease_until=now()-interval '1 second' WHERE alert_id=${id}`;
    await worker.deliverOne(); assert.equal((await row(id)).state, "UNKNOWN"); assert.equal((await row(id)).attempts, 1);
  });
  await check("Processus worker réel : publication détectée et email livré sans enqueue manuel", async () => {
    const id = await alert();
    const child = spawn(process.execPath, [new URL("../codebases/backend/worker/dist/main.js", import.meta.url).pathname], { env: process.env, stdio: "ignore" });
    try {
      let sent;
      for (let i = 0; i < 100; i++) { sent = await row(id); if (sent?.state === "SENT") break; await delay(100); }
      assert.equal(sent?.state, "SENT"); await receivedMessage("email", sent.id);
    } finally {
      const closed = new Promise((ok) => child.once("exit", ok)); child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 15000);
      try { await closed; } finally { clearTimeout(timer); }
    }
  });
  report.status = "PASS";
} catch (error) { console.error(error); report.status = "FAIL"; process.exitCode = 1; }
finally { await Promise.all(workers.map((w) => w.close())); await admin.end({ timeout: 5 }); save(); }
