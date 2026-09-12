import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Diagnostic séquentiel : créer seulement des fichiers réservés et refuser de
// remplacer un fichier existant. Ne pas exécuter en parallèle d'un build/lint/test.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = join(root, ".ci-artifacts/gate-rejections.json");
mkdirSync(dirname(reportPath), { recursive: true });
const report = { startedAt: new Date().toISOString(), status: "RUNNING", checks: [], configHashes: {} };
for (const file of ["package.json", "package-lock.json", "eslint.config.mjs", "tsconfig.base.json", ".github/workflows/ci.yml"]) {
  report.configHashes[file] = createHash("sha256").update(readFileSync(join(root, file))).digest("hex");
}

function run(args) {
  return spawnSync("npm", args, { cwd: root, encoding: "utf8", timeout: 240_000, maxBuffer: 16 * 1024 * 1024 });
}
const save = () => writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
let activeProbe = null;
function removeProbe() {
  if (activeProbe && existsSync(activeProbe.file)) {
    if (readFileSync(activeProbe.file, "utf8") !== activeProbe.content) {
      throw new Error("La sonde a été modifiée pendant le contrôle ; fichier conservé");
    }
    unlinkSync(activeProbe.file);
  }
  activeProbe = null;
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    report.status = "FAIL";
    report.reason = `Interruption ${signal}`;
    try { removeProbe(); } finally { save(); process.exit(130); }
  });
}

function assertBuildCoverage() {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const list = run(["pkg", "get", "name", "scripts", "--workspaces"]);
  if (list.status !== 0) throw new Error("Impossible d'inventorier les workspaces");
  const expected = Object.values(JSON.parse(list.stdout)).filter((workspace) => workspace.scripts?.build).map((w) => w.name).sort();
  const covered = [];
  for (const script of ["build:libs", "build:apps"]) {
    const paths = [...manifest.scripts[script].matchAll(/-w\s+(\S+)/g)].map((match) => match[1]);
    if (!paths.length || /\|\||--if-present/.test(manifest.scripts[script])) throw new Error(`Build non bloquant ou non explicite : ${script}`);
    const result = run(["pkg", "get", "name", ...paths.flatMap((path) => ["-w", path])]);
    if (result.status !== 0) throw new Error(`Workspaces introuvables : ${script}`);
    covered.push(...Object.values(JSON.parse(result.stdout)));
  }
  if (JSON.stringify(covered.sort()) !== JSON.stringify(expected)) throw new Error("Build absent ou dupliqué dans les scripts racine");
  report.workspacesBuilt = covered;
}

const typeError = 'export const ciProbe: number = "L01_TYPE_REJECTION";\n';
const probes = [
  { name: "Promesse métier non attendue", file: "codebases/backend/api/src/ci-gate-probe.ts", content: "Promise.resolve();\nexport {};\n", args: ["run", "lint"], expected: "@typescript-eslint/no-floating-promises" },
  { name: "Lint TypeScript", file: "packages/domain/src/ci-gate-probe.ts", content: "debugger;\nexport {};\n", args: ["run", "lint"], expected: "no-debugger" },
  { name: "Règles de Hooks React", file: "codebases/frontend/ui/src/ci-gate-probe.tsx", content: 'import { useState } from "react";\nexport function CiProbe({ active }: { active: boolean }) { if (active) { useState(0); } return null; }\n', args: ["run", "lint"], expected: "react-hooks/rules-of-hooks" },
  { name: "Bibliothèque partagée", file: "packages/domain/src/ci-gate-probe.ts", content: typeError, args: ["run", "build:libs"], expected: "ci-gate-probe.ts" },
  { name: "Connecteur externe", file: "codebases/external_connectors/email/src/ci-gate-probe.ts", content: typeError, args: ["run", "build:libs"], expected: "ci-gate-probe.ts" },
  ...["codebases/engine/rps", "codebases/backend/api", "codebases/backend/worker", "codebases/frontend/web", "codebases/devtools/sms-inbox", "codebases/devtools/registry-mock"].map((workspace) => ({
    name: `Build ${workspace}`, file: `${workspace}/${workspace.endsWith("/web") ? "" : "src/"}ci-gate-probe.ts`,
    content: typeError, args: ["run", "build", "-w", workspace], expected: "ci-gate-probe.ts",
  })),
  { name: "Test réellement exécuté", file: "packages/i18n/test/ci-gate-probe.test.ts", content: 'import { expect, it } from "vitest";\nit("L01_TEST_REJECTION", () => { expect(true).toBe(false); });\n', args: ["test"], expected: "L01_TEST_REJECTION" },
];

try {
  assertBuildCoverage();
  save();
  for (const probe of probes) {
    const file = join(root, probe.file);
    if (existsSync(file)) throw new Error(`Fichier de sonde déjà présent : ${probe.file}`);
    const entry = { name: probe.name, command: `npm ${probe.args.join(" ")}`, status: "RUNNING" };
    report.checks.push(entry);
    writeFileSync(file, probe.content, { flag: "wx" });
    activeProbe = { file, content: probe.content };
    try {
      console.log(`[ci:gates] ${probe.name}`);
      const result = run(probe.args);
      entry.exitCode = result.status;
      entry.rejectionObserved = `${result.stdout}\n${result.stderr}`.includes(probe.expected);
      if (result.error || result.signal || result.status !== 1 || !entry.rejectionObserved) {
        entry.status = "FAIL";
        throw new Error(`Le contrôle n'a pas rejeté la sonde attendue : ${probe.name}`);
      }
      entry.status = "PASS";
    } finally {
      removeProbe();
      save();
    }
  }
  // Next et tsc ont pu produire des caches pendant leurs diagnostics : revenir
  // à un build positif après retrait de toutes les sondes.
  for (const args of [["run", "lint"], ["run", "build"]]) {
    const result = run(args);
    if (result.error || result.status !== 0) throw new Error(`Contrôle positif après sondes en échec : npm ${args.join(" ")}`);
  }
  report.status = "PASS";
} catch (error) {
  report.status = "FAIL";
  report.reason = error.message;
  console.error(`[ci:gates] ${error.message}`);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  save();
  console.log(`[ci:gates] ${report.status} — ${report.checks.length} sondes ; preuve : .ci-artifacts/gate-rejections.json`);
}
