import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { setTimeout as delay } from "node:timers/promises";
import postgres from "postgres";
import { createS3Adapter } from "@dealpme/connector-storage";

process.umask(0o077);
const databases = ["core", "vdr", "rps"];
const buckets = [process.env.S3_BUCKET_DOSSIER, process.env.S3_BUCKET_VDR, process.env.S3_BUCKET_IDENTITY];
const artifacts = ["core.dump", "vdr.dump", "rps.dump", "minio.tar"];
async function docker(args, { input, output, env = {} } = {}) {
  const child = spawn("docker", args, { env: { ...process.env, ...env }, stdio: ["pipe", "pipe", "pipe"] });
  let error = "", text = "";
  child.stderr.on("data", (chunk) => { error += chunk; });
  const done = new Promise((ok, fail) => { child.on("error", fail); child.on("exit", (code) => code === 0 ? ok() : fail(new Error(`Docker ${args[0]} en échec (${code}) : ${error.slice(0, 2000)}`))); });
  const copy = output ? pipeline(child.stdout, createWriteStream(output, { mode: 0o600 })) : Promise.resolve();
  if (!output) child.stdout.on("data", (chunk) => { text += chunk; });
  const incoming = typeof input === "string" ? (child.stdin.end(input), Promise.resolve()) : input ? pipeline(input, child.stdin) : (child.stdin.end(), Promise.resolve());
  await Promise.all([done, copy, incoming]);
  return text.trim();
}
async function hash(path) { const digest = createHash("sha256"); for await (const bytes of createReadStream(path)) digest.update(bytes); return digest.digest("hex"); }
async function inspect(id) { return JSON.parse(await docker(["inspect", id]))[0]; }
async function service(project, name) {
  const ids = (await docker(["ps", "-q", "--filter", `label=com.docker.compose.project=${project}`, "--filter", `label=com.docker.compose.service=${name}`])).split("\n").filter(Boolean);
  if (ids.length !== 1) throw new Error(`Service requis indisponible ou ambigu : ${name}`);
  return inspect(ids[0]);
}
const quote = (value) => '"' + value.replaceAll('"', '""') + '"';
function storage(endpoint) {
  if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) throw new Error("Identifiants S3 requis");
  return createS3Adapter({ endpoint, region: process.env.S3_REGION ?? "us-east-1", accessKey: process.env.S3_ACCESS_KEY, secretKey: process.env.S3_SECRET_KEY });
}
async function backup(destination) {
  const project = process.env.DEALPME_COMPOSE_PROJECT ?? process.env.CI_TEST_PROJECT;
  if (!project || !/^[a-z0-9][a-z0-9_-]+$/.test(project)) throw new Error("DEALPME_COMPOSE_PROJECT explicite requis");
  if (buckets.some((b) => !b)) throw new Error("Les trois noms de buckets sont requis");
  const sources = {};
  for (const name of databases) sources[name] = await service(project, `postgres-${name}`);
  const minio = await service(project, "minio");
  const volume = minio.Mounts.find((m) => m.Destination === "/data" && m.Type === "volume");
  if (!volume) throw new Error("Volume MinIO nommé /data requis");
  const out = resolve(destination, `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`);
  await mkdir(out, { recursive: true, mode: 0o700 });
  const manifest = { version: 1, status: "COMPLETE", createdAt: new Date().toISOString(), project, databases: {}, objects: [], images: {}, sha256: {}, consistency: "Tables verrouillées en écriture pendant les trois snapshots et la copie MinIO arrêtée ; fenêtre de maintenance." };
  const clients = [];
  let stopped = false;
  try {
    const lockAndDump = async (index) => {
      if (index === databases.length) {
        const network = Object.keys(minio.NetworkSettings.Networks)[0];
        const s3 = storage(process.env.S3_ENDPOINT);
        // Inventaire applicatif en clair pour vérifier aussi les clés KMS après restauration.
        const internalUrl = new URL("http://minio:9000"); internalUrl.username = process.env.S3_ACCESS_KEY; internalUrl.password = process.env.S3_SECRET_KEY;
        for (const bucket of buckets) {
          const listing = await docker(["run", "--rm", "--network", network, "-e", "MC_HOST_source", "minio/mc:latest", "ls", "--recursive", "--json", `source/${bucket}`], { env: { MC_HOST_source: internalUrl.href } });
          for (const line of listing.split("\n").filter(Boolean)) {
            const item = JSON.parse(line);
            if (item.status !== "success") throw new Error("Inventaire MinIO incomplet");
            if (item.type === "file") {
              const bytes = await s3.get(bucket, item.key);
              manifest.objects.push({ bucket, key: item.key, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
            }
          }
        }
        await docker(["stop", minio.Id]); stopped = true;
        await docker(["run", "--rm", "--network", "none", "-v", `${volume.Name}:/source:ro`, "-v", `${out}:/backup`, sources.core.Image, "tar", "-cpf", "/backup/minio.tar", "-C", "/source", "."]);
        manifest.images.minio = minio.Image;
        return;
      }
      const name = databases[index];
      const source = sources[name];
      const url = process.env[name === "core" ? "DATABASE_URL_CORE_ADMIN" : `DATABASE_URL_${name.toUpperCase()}`];
      if (!url) throw new Error(`URL administrateur manquante : ${name}`);
      const target = new URL(url);
      const mapped = source.NetworkSettings.Ports["5432/tcp"];
      if (target.hostname !== "127.0.0.1" || !mapped?.some((p) => p.HostPort === target.port)) throw new Error(`URL ${name} non rattachée au projet sélectionné`);
      const sql = postgres(url, { max: 1, connect_timeout: 5 }); clients.push(sql);
      await sql.begin("isolation level repeatable read", async (tx) => {
        await tx`SET LOCAL lock_timeout='15s'`;
        const tables = await tx`SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('public','drizzle') ORDER BY schemaname,tablename`;
        if (!tables.length) throw new Error(`Base vide : ${name}`);
        await tx.unsafe(`LOCK TABLE ${tables.map((t) => `${quote(t.schemaname)}.${quote(t.tablename)}`).join(",")} IN SHARE MODE`);
        const snapshot = (await tx`SELECT pg_export_snapshot() snapshot`)[0].snapshot;
        const counts = {};
        for (const t of tables) counts[`${t.schemaname}.${t.tablename}`] = (await tx.unsafe(`SELECT count(*)::text n FROM ${quote(t.schemaname)}.${quote(t.tablename)}`))[0].n;
        await docker(["exec", source.Id, "pg_dump", "-U", decodeURIComponent(target.username), "-d", target.pathname.slice(1), "-Fc", "--no-owner", `--snapshot=${snapshot}`], { output: resolve(out, `${name}.dump`) });
        manifest.databases[name] = { counts, database: target.pathname.slice(1), user: decodeURIComponent(target.username) }; manifest.images[name] = source.Image;
        await lockAndDump(index + 1);
      });
    };
    await lockAndDump(0);
    for (const file of artifacts) manifest.sha256[file] = await hash(resolve(out, file));
    await writeFile(resolve(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    console.log(JSON.stringify({ event: "BACKUP_COMPLETE", path: out, databases: 3, objects: manifest.objects.length }));
    return out;
  } finally {
    if (stopped) await docker(["start", minio.Id]);
    await Promise.all(clients.map((sql) => sql.end({ timeout: 5 })));
  }
}

async function restore(source) {
  const src = resolve(source);
  const manifest = JSON.parse(await readFile(resolve(src, "manifest.json"), "utf8"));
  if (manifest.version !== 1 || manifest.status !== "COMPLETE" || databases.some((name) => !manifest.databases[name])) throw new Error("Manifeste incomplet");
  for (const file of artifacts) if (await hash(resolve(src, file)) !== manifest.sha256[file]) throw new Error(`Empreinte invalide : ${file}`);
  const prefix = `dealpme-restore-${randomBytes(6).toString("hex")}`;
  const containers = [], volumes = [];
  let networkCreated = false;
  try {
    await docker(["network", "create", prefix]); networkCreated = true;
    for (const name of databases) {
      const config = manifest.databases[name], container = `${prefix}-${name}`;
      await docker(["run", "-d", "--name", container, "--network", "none", "-e", `POSTGRES_USER=${config.user}`, "-e", `POSTGRES_DB=${config.database}`, "-e", "POSTGRES_PASSWORD", manifest.images[name]], { env: { POSTGRES_PASSWORD: randomBytes(24).toString("hex") } }); containers.push(container);
      let ready = false;
      for (let i = 0; i < 60; i++) { try { await docker(["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", config.user]); ready = true; break; } catch { await delay(250); } }
      if (!ready) throw new Error(`Restauration ${name} : PostgreSQL indisponible`);
      await docker(["exec", "-i", container, "psql", "-U", config.user, "-d", config.database, "-v", "ON_ERROR_STOP=1"], { input: "CREATE ROLE dealpme_api NOLOGIN; CREATE ROLE dealpme_worker NOLOGIN;" });
      await docker(["exec", "-i", container, "pg_restore", "-U", config.user, "-d", config.database, "--exit-on-error", "--no-owner"], { input: createReadStream(resolve(src, `${name}.dump`)) });
      for (const [table, expected] of Object.entries(config.counts)) {
        const actual = await docker(["exec", container, "psql", "-U", config.user, "-d", config.database, "-v", "ON_ERROR_STOP=1", "-tAc", `SELECT count(*) FROM ${table.split(".").map(quote).join(".")}`]);
        if (actual !== expected) throw new Error(`Décompte différent du manifeste : ${name}/${table}`);
      }
    }
    const volume = `${prefix}-objects`; await docker(["volume", "create", volume]); volumes.push(volume);
    await docker(["run", "--rm", "--network", "none", "-v", `${volume}:/target`, "-v", `${src}:/backup:ro`, manifest.images.core, "tar", "-xpf", "/backup/minio.tar", "-C", "/target"]);
    const minio = `${prefix}-minio`;
    await docker(["run", "-d", "--name", minio, "--network", prefix, "-p", "127.0.0.1::9000", "-v", `${volume}:/data`, "-e", "MINIO_ROOT_USER", "-e", "MINIO_ROOT_PASSWORD", "-e", "MINIO_KMS_SECRET_KEY", manifest.images.minio, "server", "/data"], {
      env: { MINIO_ROOT_USER: process.env.S3_ACCESS_KEY, MINIO_ROOT_PASSWORD: process.env.S3_SECRET_KEY, MINIO_KMS_SECRET_KEY: process.env.MINIO_KMS_SECRET_KEY ?? "" },
    }); containers.push(minio);
    const endpoint = `http://${await docker(["port", minio, "9000/tcp"])}`;
    let ready = false;
    for (let i = 0; i < 80; i++) { try { if ((await fetch(`${endpoint}/minio/health/ready`)).ok) { ready = true; break; } } catch { /* Démarrage. */ } await delay(250); }
    if (!ready) throw new Error("MinIO restauré indisponible");
    const s3 = storage(endpoint);
    for (const object of manifest.objects) {
      const bytes = await s3.get(object.bucket, object.key);
      if (bytes.length !== object.size || createHash("sha256").update(bytes).digest("hex") !== object.sha256) throw new Error("Objet restauré non conforme");
    }
    const result = { status: "PASS", restoredAt: new Date().toISOString(), databases: databases.map((name) => ({ name, tables: Object.keys(manifest.databases[name].counts).length })), objects: manifest.objects.length, comparison: "backup manifest", disposable: true };
    await writeFile(resolve(src, "restore-result.json"), JSON.stringify(result, null, 2) + "\n");
    console.log(JSON.stringify({ event: "RESTORE_VERIFIED", ...result }));
  } finally {
    const failures = [];
    for (const id of containers.reverse()) { try { await docker(["rm", "-f", "-v", id]); } catch (error) { failures.push(error); } }
    for (const id of volumes) { try { await docker(["volume", "rm", id]); } catch (error) { failures.push(error); } }
    if (networkCreated) { try { await docker(["network", "rm", prefix]); } catch (error) { failures.push(error); } }
    if (failures.length) { process.exitCode = 1; console.error("Nettoyage des cibles jetables incomplet"); }
  }
}

const [action, path] = process.argv.slice(2);
if (action === "backup" && path) await backup(path);
else if (action === "restore" && path) await restore(path);
else throw new Error("Usage : backup.mjs backup|restore chemin");
