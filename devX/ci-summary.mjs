import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, ".ci-artifacts"), { recursive: true });
// Liste fermée : jamais de dump de process.env ou de fichier .env dans un artefact.
writeFileSync(join(root, ".ci-artifacts/job-summary.json"), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  status: process.env.CI_JOB_STATUS ?? "unknown",
  commit: process.env.GITHUB_SHA ?? null,
  runId: process.env.GITHUB_RUN_ID ?? null,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
}, null, 2)}\n`);
