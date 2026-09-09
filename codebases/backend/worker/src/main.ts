import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { QUEUES, type IngestionJob, type MatchingJob, type NotificationJob, type WebhookJob } from "./queues/definitions.js";

/**
 * Worker DealPME. Un processus, plusieurs files. Concurrence pilotée par WORKER_CONCURRENCY.
 * Les traitements sont idempotents : la clé du job est réutilisée comme jobId BullMQ (dédoublonnage natif).
 */
const connection = new IORedis(process.env["REDIS_URL"] ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
const concurrency = Number(process.env["WORKER_CONCURRENCY"] ?? 4);

function log(queue: string, job: Job, message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[${queue}] job ${job.id} ${message}`);
}

const workers = [
  new Worker<MatchingJob>(QUEUES.MATCHING, async (job) => {
    // V1 : rankMatches (@dealpme/rules) sur les opportunités T0 et la thèse de l'investisseur ; alerte seulement avec opt-in.
    log(QUEUES.MATCHING, job, `matching pour ${job.data.investorUserId} (à brancher sur la base core en lecture)`);
  }, { connection, concurrency }),

  new Worker<NotificationJob>(QUEUES.NOTIFICATIONS, async (job) => {
    // Consentement vérifié côté API avant mise en file ; ici : envoi via le connecteur SMS ou email, avec repli.
    log(QUEUES.NOTIFICATIONS, job, `${job.data.channel} ${job.data.templateKey} -> ${job.data.category}`);
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
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

// eslint-disable-next-line no-console
console.log(`Worker DealPME démarré : ${workers.map((w) => w.name).join(", ")} (concurrence ${concurrency})`);
