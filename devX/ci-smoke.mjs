import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

// Cette commande utilise uniquement .env.example, des secrets éphémères et des
// volumes neufs. Elle ne réinitialise jamais le projet Docker ni les comptes locaux.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = join(root, ".ci-artifacts");
mkdirSync(artifacts, { recursive: true });
const privateDir = mkdtempSync(join(tmpdir(), "dealpme-ci-"));
const project = `dealpme-ci-${process.pid}-${randomBytes(4).toString("hex")}`;
const composeEnv = join(privateDir, "compose.env");
writeFileSync(composeEnv, "", { mode: 0o600 });
const env = {
  ...process.env,
  ...parseEnv(readFileSync(join(root, ".env.example"), "utf8")),
  NODE_ENV: "development",
  SESSION_SECRET: randomBytes(32).toString("base64"),
  FIELD_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
  CONNECTOR_REMO_WEBHOOK_SECRET: randomBytes(32).toString("base64"),
  DEMO_CREDENTIALS_FILE: join(privateDir, "credentials.json"),
  CI_TEST_PROJECT: project,
};
const compose = ["compose", "--env-file", composeEnv, "-p", project,
  "-f", join(root, "infra/docker-compose.yml"), "-f", join(root, "infra/docker-compose.ci.yml")];
const report = { startedAt: new Date().toISOString(), project, status: "RUNNING", steps: [], checks: [] };
const children = [];
let infrastructureStarted = false;
let commandNumber = 0;
let interrupted = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    interrupted = true;
    for (const child of children) child.kill("SIGTERM");
  });
}

function saveReport() {
  writeFileSync(join(artifacts, "smoke-results.json"), `${JSON.stringify(report, null, 2)}\n`);
}

function command(program, args, options = {}) {
  const result = spawnSync(program, args, {
    cwd: root, env, encoding: "utf8", timeout: 120_000, maxBuffer: 16 * 1024 * 1024, ...options,
  });
  // Le détail reste privé : les faux transports peuvent y écrire des codes OTP.
  writeFileSync(join(privateDir, `command-${++commandNumber}.log`),
    `${result.stdout ?? ""}\n${result.stderr ?? ""}`, { mode: 0o600 });
  if (result.error || result.status !== 0) {
    throw new Error(`${program} : commande ${commandNumber} en échec (code ${result.status ?? "interrompu"})`);
  }
  return result.stdout.trim();
}

const dc = (args, options) => command("docker", [...compose, ...args], options);

async function step(name, work) {
  const entry = { name, status: "RUNNING", startedAt: new Date().toISOString() };
  report.steps.push(entry);
  saveReport();
  console.log(`[ci:smoke] ${name}`);
  try {
    if (interrupted) throw new Error("Exécution interrompue");
    await work();
    if (interrupted) throw new Error("Exécution interrompue");
    entry.status = "PASS";
  } catch (error) {
    entry.status = "FAIL";
    // Les erreurs émises ici ne contiennent ni sortie de commande, ni environnement.
    entry.reason = error.message;
    throw error;
  } finally {
    entry.finishedAt = new Date().toISOString();
    saveReport();
  }
}

async function availablePort() {
  const server = createServer();
  await new Promise((ok, fail) => { server.once("error", fail); server.listen(0, "127.0.0.1", ok); });
  const port = server.address().port;
  await new Promise((ok, fail) => server.close((error) => error ? fail(error) : ok()));
  return port;
}

function mappedPort(service, port) {
  const address = dc(["port", service, String(port)]);
  const match = /^127\.0\.0\.1:(\d+)$/.exec(address);
  if (!match) throw new Error(`Port local absent pour ${service}`);
  return Number(match[1]);
}

async function waitFor(name, predicate, seconds = 60) {
  const deadline = Date.now() + seconds * 1000;
  do {
    if (interrupted) throw new Error("Exécution interrompue pendant l'attente");
    if (await predicate()) return;
    await delay(1000);
  } while (Date.now() < deadline);
  throw new Error(`Délai de disponibilité dépassé : ${name} (${seconds} s)`);
}

function startApp(workspace, name) {
  const fd = openSync(join(privateDir, `${name}.log`), "w", 0o600);
  const child = spawn(process.execPath, ["dist/main.js"], { cwd: join(root, workspace), env, stdio: ["ignore", fd, fd] });
  closeSync(fd);
  child.on("error", () => { child.startFailed = true; });
  children.push(child);
  return child;
}

async function httpReady(url, expectedStatus, child) {
  if (child?.startFailed || child?.exitCode != null || child?.signalCode != null) {
    throw new Error("Le processus applicatif a quitté avant sa disponibilité");
  }
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    await response.arrayBuffer();
    return response.status === expectedStatus;
  } catch {
    return false;
  }
}

async function stopApps() {
  for (const child of children) {
    if (!child.pid || child.startFailed || child.exitCode != null || child.signalCode != null) continue;
    child.kill("SIGTERM");
    const exited = new Promise((ok) => child.once("exit", ok));
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    await exited;
    clearTimeout(timer);
  }
}

try {
  await step("Infrastructure isolée", async () => {
    command("docker", ["info", "--format", "{{.ServerVersion}}"]);
    // Marquer avant up : nettoyer aussi un démarrage partiellement échoué.
    infrastructureStarted = true;
    dc(["up", "-d"], { timeout: 180_000 });
    await waitFor("Postgres, Redis, ClamAV et stockage", () => {
      const ids = dc(["ps", "-aq"]).split(/\s+/).filter(Boolean);
      if (ids.length !== 8) return false;
      const containers = JSON.parse(command("docker", ["inspect", ...ids]));
      return containers.every((container) => {
        const name = container.Config.Labels["com.docker.compose.service"];
        if (name === "minio-init") {
          if (container.State.Status === "exited" && container.State.ExitCode !== 0) throw new Error("Initialisation des buckets refusée");
          return container.State.Status === "exited" && container.State.ExitCode === 0;
        }
        return container.State.Running && (!container.State.Health || container.State.Health.Status === "healthy");
      });
    }, 420);
  });
  await step("Configuration éphémère", async () => {
    const core = mappedPort("postgres-core", 5432);
    env.DATABASE_URL_CORE = `postgres://dealpme_api:dealpme_api@127.0.0.1:${core}/dealpme_core`;
    env.DATABASE_URL_CORE_ADMIN = `postgres://dealpme_core:dealpme_core@127.0.0.1:${core}/dealpme_core`;
    env.DATABASE_URL_VDR = `postgres://dealpme_vdr:dealpme_vdr@127.0.0.1:${mappedPort("postgres-vdr", 5432)}/dealpme_vdr`;
    env.DATABASE_URL_RPS = `postgres://dealpme_rps:dealpme_rps@127.0.0.1:${mappedPort("postgres-rps", 5432)}/dealpme_rps`;
    env.REDIS_URL = `redis://127.0.0.1:${mappedPort("redis", 6379)}`;
    env.S3_ENDPOINT = `http://127.0.0.1:${mappedPort("minio", 9000)}`;
    env.CLAMAV_HOST = "127.0.0.1";
    env.CLAMAV_PORT = String(mappedPort("clamav", 3310));
    env.API_PORT = String(await availablePort());
    do { env.RPS_PORT = String(await availablePort()); } while (env.RPS_PORT === env.API_PORT);
    env.RPS_BASE_URL = `http://127.0.0.1:${env.RPS_PORT}`;
    env.SMOKE_CORE_CONTAINER = dc(["ps", "-q", "postgres-core"]);
    env.SMOKE_REDIS_CONTAINER = dc(["ps", "-q", "redis"]);
    await waitFor("MinIO", () => httpReady(`${env.S3_ENDPOINT}/minio/health/ready`, 200));
  });
  await step("Migrations et RLS", () => {
    command("npm", ["run", "db:migrate", "-w", "codebases/backend/api"]);
    command("npm", ["exec", "-w", "codebases/backend/api", "--", "drizzle-kit", "migrate", "--config", "drizzle.vdr.config.ts"]);
    command("npm", ["run", "db:migrate", "-w", "codebases/engine/rps"]);
    dc(["exec", "-T", "postgres-core", "psql", "-U", "dealpme_core", "-d", "dealpme_core", "-v", "ON_ERROR_STOP=1"],
      { input: readFileSync(join(root, "codebases/backend/api/drizzle/core/rls.sql"), "utf8") });
  });
  await step("Jeu synthétique isolé", () => {
    command(process.execPath, ["--require", "tsx/cjs", "src/seed/seed.ts"], { cwd: join(root, "codebases/backend/api") });
  });
  await step("Disponibilité API et RPS", async () => {
    const api = startApp("codebases/backend/api", "api");
    const rps = startApp("codebases/engine/rps", "rps");
    await waitFor("API /ready", () => httpReady(`http://127.0.0.1:${env.API_PORT}/v1/ready`, 200, api));
    await waitFor("RPS et sa base", () => httpReady(`http://127.0.0.1:${env.RPS_PORT}/v1/deals/018f0000-0000-7000-8000-000000000001/circle`, 404, rps));
  });
  await step("Smoke V1 et antivirus réel", () => {
    const result = spawnSync("bash", ["devX/smoke_v1.sh", `http://127.0.0.1:${env.API_PORT}/v1`],
      { cwd: root, env, encoding: "utf8", timeout: 180_000, maxBuffer: 16 * 1024 * 1024 });
    writeFileSync(join(privateDir, "smoke.log"), `${result.stdout ?? ""}\n${result.stderr ?? ""}`, { mode: 0o600 });
    report.checks = (result.stdout ?? "").split("\n").filter((line) => /^(OK|KO)\s/.test(line)).map((line) => ({
      name: line.replace(/^(OK|KO)\s+/, "").replace(/\s+\(.*/, ""), passed: line.startsWith("OK"),
    }));
    if (result.error || result.status !== 0 || report.checks.length === 0 || report.checks.some((check) => !check.passed)) {
      throw new Error(`Smoke refusé : ${report.checks.filter((check) => !check.passed).length} contrôle(s) en échec ; code ${result.status}`);
    }
  });
  await step("L02 : transactions, migration et navigateur", () => {
    command(process.execPath, ["devX/l02-integration.mjs"], { timeout: 240_000 });
  });
  report.status = "PASS";
} catch (error) {
  report.status = "FAIL";
  console.error(`[ci:smoke] ${error.message}`);
  process.exitCode = 1;
} finally {
  if (infrastructureStarted && report.status !== "PASS") {
    try { dc(["logs", "--no-color", "--tail", "200"]); }
    catch { /* Diagnostics facultatifs ; conserver l'échec initial. */ }
  }
  await stopApps();
  if (infrastructureStarted) {
    try { dc(["down", "--volumes", "--remove-orphans"], { timeout: 60_000 }); }
    catch { report.status = "FAIL"; report.cleanupFailed = true; process.exitCode = 1; }
  }
  report.finishedAt = new Date().toISOString();
  saveReport();
  if (report.status === "PASS") rmSync(privateDir, { recursive: true });
  else console.error(`[ci:smoke] Journaux privés de diagnostic : ${privateDir}`);
  console.log(`[ci:smoke] ${report.status} — ${report.checks.length} contrôles ; preuve : .ci-artifacts/smoke-results.json`);
}
