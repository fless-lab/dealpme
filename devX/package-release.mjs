import { spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, access, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
for (const file of ["codebases/backend/api/dist/main.js", "codebases/backend/worker/dist/main.js", "codebases/engine/rps/dist/main.js", "codebases/frontend/web/.next/BUILD_ID"]) await access(resolve(root, file));
const git = (args) => { const result = spawnSync("git", args, { cwd: root, encoding: "utf8" }); if (result.status) throw new Error("Référence Git indisponible"); return result.stdout.trim(); };
const revision = git(["rev-parse", "HEAD"]);
const out = resolve(root, ".ci-artifacts/release"); await mkdir(out, { recursive: true });
const archive = resolve(out, "dealpme-release.tar.gz");
const result = spawnSync("tar", ["-czf", archive, "--exclude=node_modules", "--exclude=.next/cache", "--exclude=.env", "--exclude=.env.*", "--exclude=*.log", "--exclude=*.tsbuildinfo", "--exclude=coverage",
  "package.json", "package-lock.json", "tsconfig.base.json", "eslint.config.mjs", "packages", "codebases", "devX", "infra", "docs/EXPLOITATION_L04.md", "docs/EVENEMENTS_L05.md", "docs/INTEGRATION_REMO.md", "docs/REMO_RACCORDEMENT.md"], { cwd: root, encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr);
const hash = createHash("sha256"); for await (const chunk of createReadStream(archive)) hash.update(chunk);
const digest = hash.digest("hex");
await writeFile(resolve(out, "SHA256SUMS"), `${digest}  dealpme-release.tar.gz\n`);
await writeFile(resolve(out, "release.json"), JSON.stringify({ revision, dirty: !!git(["status", "--porcelain"]), builtAt: new Date().toISOString(), node: process.version, sha256: digest, deployment: "PENDING_A19" }, null, 2) + "\n");
console.log("Artefact de livraison et empreinte produits dans .ci-artifacts/release");
