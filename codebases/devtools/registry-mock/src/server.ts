import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { normalizeRccm } from "@dealpme/connector-registry";

export const scenarios = [
  ["TG-MOCK-MATCH", "Correspondance : Entreprise synthétique CFE, SARL"],
  ["TG-MOCK-ABSENT", "Introuvable"], ["TG-MOCK-DIVERGENT", "Dénomination divergente"],
  ["TG-MOCK-STRUCK", "Radiée"], ["TG-MOCK-INCOMPLETE", "Données incomplètes"],
  ["TG-MOCK-MALFORMED", "Réponse malformée"], ["TG-MOCK-TIMEOUT", "Délai dépassé"],
  ["TG-MOCK-429", "Limite de débit"], ["TG-MOCK-503", "Indisponible"],
] as const;

/** Simulateur autonome, sans données métier, contrôle de scénario par identifiant synthétique. */
export function createRegistryMock(options: { nodeEnv?: string; allowedHosts?: string[] } = {}) {
  if ((options.nodeEnv ?? process.env["NODE_ENV"]) === "production") throw new Error("Mock CFE interdit en production");
  let lookups = 0;
  return createServer(async (req, res) => {
    const send = (status: number, data: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      res.end(JSON.stringify(data));
    };
    const host = req.headers.host?.split(":")[0];
    if (!host || !(options.allowedHosts ?? ["localhost", "127.0.0.1", "registry-mock"]).includes(host) || req.headers.origin) { send(403, { error: "LOCAL_ONLY" }); return; }
    if (req.method === "GET" && req.url === "/health") { send(200, { status: "ok", synthetic: true, lookups }); return; }
    if (req.method === "GET" && req.url === "/scenarios") { send(200, { synthetic: true, scenarios }); return; }
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'", "Cache-Control": "no-store" });
      res.end(`<html lang="fr"><meta name="viewport" content="width=device-width"><title>Registre synthétique</title><h1>Mock CFE — données synthétiques</h1><p>Aucune consultation de l'administration. POST /lookups avec rccmNumber.</p><ul>${scenarios.map(([id, label]) => `<li><code>${id}</code> : ${label}</li>`).join("")}</ul></html>`);
      return;
    }
    if (req.method !== "POST" || req.url !== "/lookups") { send(404, { error: "NOT_FOUND" }); return; }
    if (req.headers["content-type"]?.split(";")[0] !== "application/json") { send(415, { error: "JSON_REQUIRED" }); return; }
    const chunks: Buffer[] = [];
    let bytes = 0;
    try {
      for await (const chunk of req) {
        const buffer = Buffer.from(chunk as Uint8Array);
        bytes += buffer.length;
        if (bytes > 1024) { send(413, { error: "BODY_TOO_LARGE" }); return; }
        chunks.push(buffer);
      }
      const input = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>;
      if (!input || Object.keys(input).length !== 1 || typeof input["rccmNumber"] !== "string") { send(400, { error: "INVALID_REQUEST" }); return; }
      const rccmNumber = normalizeRccm(input["rccmNumber"]);
      if (rccmNumber.length < 3 || rccmNumber.length > 64) { send(400, { error: "INVALID_RCCM" }); return; }
      lookups++;
      if (rccmNumber === "TG-MOCK-TIMEOUT") {
        const timer = setTimeout(() => send(504, { error: "SIMULATED_TIMEOUT" }), 35000);
        res.once("close", () => clearTimeout(timer));
        return;
      }
      if (rccmNumber === "TG-MOCK-429" || rccmNumber === "TG-MOCK-503") { send(rccmNumber.endsWith("429") ? 429 : 503, { error: "SIMULATED" }); return; }
      if (rccmNumber === "TG-MOCK-MALFORMED") { send(200, { found: "yes" }); return; }
      const found = scenarios.some(([id]) => id === rccmNumber) && rccmNumber !== "TG-MOCK-ABSENT";
      send(200, {
        found, rccmNumber, provider: "mock", synthetic: true,
        sourceRef: `SYNTHETIC-${randomUUID()}`, verifiedAt: new Date().toISOString(),
        ...(found ? {
          legalName: rccmNumber === "TG-MOCK-DIVERGENT" ? "Autre entreprise synthétique" : "Entreprise synthétique CFE",
          ...(rccmNumber === "TG-MOCK-INCOMPLETE" ? {} : { legalForm: "SARL", status: rccmNumber === "TG-MOCK-STRUCK" ? "STRUCK_OFF" : "ACTIVE" }),
        } : {}),
      });
    } catch { if (!res.headersSent) send(400, { error: "INVALID_JSON" }); }
  });
}

if (require.main === module) {
  const server = createRegistryMock();
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.listen(Number(process.env["PORT"] ?? 8027), process.env["HOST"] ?? "127.0.0.1");
  const stop = () => { server.close(); server.closeAllConnections(); };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
