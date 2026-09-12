import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const source = "https://api.virtual.events.com/api/docs/swagger-ui-init.js";
const response = await fetch(source, { signal: AbortSignal.timeout(30000), redirect: "error" });
if (!response.ok) throw new Error(`Documentation Remo indisponible : ${response.status}`);
const text = await response.text();
if (text.length > 2_000_000) throw new Error("Document inattendu");
const marker = text.indexOf('"swaggerDoc":');
if (marker < 0) throw new Error("Objet OpenAPI absent");
const start = text.indexOf("{", marker);
let depth = 0, quoted = false, escaped = false, end = -1;
for (let i = start; i < text.length; i++) {
  const c = text[i];
  if (quoted) { if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') quoted = false; }
  else if (c === '"') quoted = true;
  else if (c === "{") depth++;
  else if (c === "}" && --depth === 0) { end = i + 1; break; }
}
if (end < 0) throw new Error("JSON OpenAPI incomplet");
const contract = JSON.parse(text.slice(start, end)); // Aucun JavaScript fournisseur n'est exécuté.
if (contract.openapi !== "3.0.0" || contract.info?.title !== "Remo - External API" || !contract.paths) throw new Error("Contrat inattendu");
const originalSha256 = createHash("sha256").update(JSON.stringify(contract)).digest("hex");
// Les exemples publics comportent des emails et une URL de média signée : ne pas les recopier tels quels.
for (const example of Object.values(contract.components.examples ?? {})) {
  if (typeof example.value === "string") example.value = example.value.replace(/token=[^"\\\s&]+/g, "token=REDACTED").replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "fixture@example.test");
}
const body = JSON.stringify(contract, null, 2) + "\n";
const folder = resolve(import.meta.dirname, "../codebases/external_connectors/remo/contracts");
await mkdir(folder, { recursive: true });
await writeFile(resolve(folder, "openapi.json"), body);
await writeFile(resolve(folder, "source.json"), JSON.stringify({ source, fetchedAt: new Date().toISOString(), sha256: createHash("sha256").update(body).digest("hex"), originalSha256, exampleRedaction: "Emails et tokens des URL remplacés uniquement dans les exemples", authenticated: false }, null, 2) + "\n");
console.log(JSON.stringify({ title: contract.info.title, version: contract.info.version, paths: Object.keys(contract.paths), schemas: Object.keys(contract.components.schemas).length }, null, 2));
