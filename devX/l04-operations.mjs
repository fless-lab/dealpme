import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, appendFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";
import { createSmtpAdapter } from "@dealpme/connector-email";
import { monitor } from "./monitor.mjs";
import { receivedMessage } from "./notification-inbox.mjs";

const root = resolve(import.meta.dirname, "..");
if (!/^dealpme-ci-/.test(process.env.CI_TEST_PROJECT ?? "")) throw new Error("Pile CI isolée requise");
const inspect = spawnSync("docker", ["inspect", process.env.SMOKE_CORE_CONTAINER], { encoding: "utf8" });
assert.equal(inspect.status, 0);
const core = JSON.parse(inspect.stdout)[0];
assert.equal(core.Config.Labels["com.docker.compose.project"], process.env.CI_TEST_PROJECT);
assert(core.NetworkSettings.Ports["5432/tcp"].some((p) => p.HostPort === new URL(process.env.DATABASE_URL_CORE_ADMIN).port));
await mkdir("/tmp/opencode", { recursive: true });
const privateDir = await mkdtemp("/tmp/opencode/l04-operations-");
const admin = postgres(process.env.DATABASE_URL_CORE_ADMIN, { max: 2 });
const api = `http://127.0.0.1:${process.env.API_PORT}/v1`;
const report = { status: "RUNNING", checks: [] };
const save = () => writeFile(resolve(root, ".ci-artifacts/l04-operations-results.json"), JSON.stringify(report, null, 2) + "\n");
async function check(name, work) { const row = { name, status: "RUNNING" }; report.checks.push(row); try { await work(); row.status = "PASS"; console.log(`[L04 exploitation] OK ${name}`); } catch (error) { row.status = "FAIL"; throw error; } finally { await save(); } }
const run = (action, path, env = {}) => spawnSync(process.execPath, ["devX/backup.mjs", action, path], { cwd: root, env: { ...process.env, ...env }, encoding: "utf8", timeout: 180000 });
try {
  await check("Incident 5xx réel : métrique et notification reçue dans Mailpit", async () => {
    await admin.unsafe(`CREATE FUNCTION l04_monitor_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.action='ALERT_SAVED' THEN RAISE EXCEPTION 'incident supervision de recette'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER l04_monitor_fault BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION l04_monitor_fault();`);
    try {
      const credentials = JSON.parse(await readFile(process.env.DEMO_CREDENTIALS_FILE, "utf8"));
      const email = "investisseur@demo.dealpme.local";
      const login = await fetch(`${api}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: credentials[email] }) });
      assert.equal(login.status, 200); const { token } = await login.json();
      for (let i = 0; i < 10; i++) {
        const response = await fetch(`${api}/alerts`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ label: "Incident contrôlé L04" }) });
        assert.equal(response.status, 500);
      }
    } finally { await admin.unsafe("DROP TRIGGER l04_monitor_fault ON audit_event; DROP FUNCTION l04_monitor_fault();"); }
    assert.equal((await (await fetch(`${api}/health`)).json()).status, "degraded");
    assert((await (await fetch(`${api}/metrics`)).text()).includes("dealpme_server_errors_5m"));
    const options = { baseUrl: api, stateFile: resolve(privateDir, "monitor.json"), to: "exploitation@example.test", email: createSmtpAdapter({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT), from: process.env.EMAIL_FROM }) };
    const incident = await monitor(options); assert(incident.notified);
    const message = await receivedMessage("email", incident.id); assert.equal(message.to[0].Address, options.to);
    assert.equal((await monitor(options)).notified, false);
  });
  let backup;
  await check("Sauvegarde complète : trois snapshots cohérents et volume MinIO", async () => {
    const result = run("backup", privateDir);
    assert.equal(result.status, 0, result.stderr);
    backup = JSON.parse(result.stdout.trim().split("\n").find((line) => line.includes('"BACKUP_COMPLETE"'))).path;
    const manifest = JSON.parse(await readFile(resolve(backup, "manifest.json"), "utf8"));
    assert.equal(Object.keys(manifest.databases).length, 3); assert(manifest.objects.length > 0);
    assert.equal(manifest.status, "COMPLETE");
  });
  await check("Restauration jetable : bases, politiques et objets déchiffrés comparés au manifeste", async () => {
    // La clé reste fournie séparément du fichier de sauvegarde.
    const ids = spawnSync("docker", ["ps", "-q", "--filter", `label=com.docker.compose.project=${process.env.CI_TEST_PROJECT}`, "--filter", "label=com.docker.compose.service=minio"], { encoding: "utf8" });
    const source = JSON.parse(spawnSync("docker", ["inspect", ids.stdout.trim()], { encoding: "utf8" }).stdout)[0];
    const key = source.Config.Env.find((entry) => entry.startsWith("MINIO_KMS_SECRET_KEY=")).slice("MINIO_KMS_SECRET_KEY=".length);
    const result = run("restore", backup, { MINIO_KMS_SECRET_KEY: key });
    assert.equal(result.status, 0, result.stderr);
    const evidence = JSON.parse(await readFile(resolve(backup, "restore-result.json"), "utf8"));
    assert.equal(evidence.status, "PASS"); assert.equal(evidence.databases.length, 3);
    await writeFile(resolve(root, ".ci-artifacts/l04-restore-results.json"), JSON.stringify(evidence, null, 2) + "\n");
  });
  await check("Archive altérée : restauration refusée avant création des cibles", async () => {
    await appendFile(resolve(backup, "core.dump"), "corruption de recette");
    const result = run("restore", backup); assert.notEqual(result.status, 0); assert(result.stderr.includes("Empreinte invalide"));
  });
  report.status = "PASS";
} catch (error) { console.error(error); report.status = "FAIL"; process.exitCode = 1; }
finally { await admin.end({ timeout: 5 }); await rm(privateDir, { recursive: true, force: true }); await save(); }
