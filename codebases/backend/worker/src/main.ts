import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { QUEUES, type IngestionJob, type MatchingJob, type NotificationJob, type WebhookJob } from "./queues/definitions.js";
import { createSmtpAdapter } from "@dealpme/connector-email";
import { AlertWorker } from "./alerts.js";

/**
 * Worker DealPME. Un processus, plusieurs files. Concurrence pilotée par WORKER_CONCURRENCY.
 * Les traitements sont idempotents : la clé du job est réutilisée comme jobId BullMQ (dédoublonnage natif).
 */
const connection = new IORedis(process.env["REDIS_URL"] ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
const concurrency = Number(process.env["WORKER_CONCURRENCY"] ?? 4);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) throw new Error("WORKER_CONCURRENCY invalide");
const smtpSecure = process.env["SMTP_SECURE"] ?? "false";
const requireTLS = process.env["SMTP_REQUIRE_TLS"] ?? "false";
if (![smtpSecure, requireTLS].every((v) => v === "true" || v === "false")) throw new Error("Booléens SMTP invalides");
if (process.env["NODE_ENV"] === "production" && (process.env["CONNECTOR_EMAIL_PROVIDER"] !== "smtp" || (smtpSecure !== "true" && requireTLS !== "true") || !process.env["SMTP_USER"] || !process.env["SMTP_PASSWORD"])) throw new Error("SMTP réel authentifié et TLS requis");
const alerts = new AlertWorker(process.env["DATABASE_URL_WORKER"] ?? "", createSmtpAdapter({
  host: process.env["SMTP_HOST"] ?? "127.0.0.1", port: Number(process.env["SMTP_PORT"] ?? 1025),
  from: process.env["EMAIL_FROM"] ?? "notifications@demo.dealpme.local", secure: smtpSecure === "true", requireTLS: requireTLS === "true",
  ...(process.env["SMTP_USER"] ? { user: process.env["SMTP_USER"]!, password: process.env["SMTP_PASSWORD"]! } : {}),
}), (process.env["APP_BASE_URL"] ?? "http://localhost:3000").replace(/\/$/, ""));
let stopped = false;
async function pollAlerts() {
  while (!stopped) {
    try {
      await alerts.matchBatch();
      for (let i = 0; i < 50 && !stopped; i++) if (!await alerts.deliverOne()) break;
    } catch {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify({ service: "worker", event: "ALERT_POLL_FAILED" }));
    }
    if (!stopped) await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
const polling = pollAlerts();

function log(queue: string, job: Job, message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[${queue}] job ${job.id} ${message}`);
}

const workers = [
  new Worker<MatchingJob>(QUEUES.MATCHING, async (job) => {
    await alerts.matchBatch();
    log(QUEUES.MATCHING, job, "intentions persistées");
  }, { connection, concurrency }),

  new Worker<NotificationJob>(QUEUES.NOTIFICATIONS, async (job) => {
    await alerts.deliverOne();
    log(QUEUES.NOTIFICATIONS, job, "outbox traitée avec réévaluation des droits");
  }, { connection, concurrency }),

  new Worker<IngestionJob>(QUEUES.INGESTION, async (job) => {
    // V2 : SCAN (antivirus) -> OCR -> RENDER_PAGES (filigrane) -> FINGERPRINT ; chaque étape change le statut du document.
    log(QUEUES.INGESTION, job, `étape ${job.data.step} pour ${job.data.documentId}`);
  }, { connection, concurrency: Math.max(1, Math.floor(concurrency / 2)) }),

  new Worker<WebhookJob>(QUEUES.WEBHOOKS, async (job) => {
    // La signature a déjà été vérifiée par l'API ; ici : application idempotente de l'effet (paiement, NDA, présence Remo).
    log(QUEUES.WEBHOOKS, job, `source ${job.data.source}`);
  }, { connection, concurrency }),
];

for (const w of workers) {
  w.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`[${w.name}] job ${job?.id} en échec :`, err.message);
  });
}

async function shutdown(): Promise<void> {
  stopped = true;
  await Promise.all(workers.map((w) => w.close()));
  await polling;
  await alerts.close();
  await connection.quit();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

// eslint-disable-next-line no-console
console.log(`Worker DealPME démarré : ${workers.map((w) => w.name).join(", ")} (concurrence ${concurrency})`);
