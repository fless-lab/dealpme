import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { LocalEventSchema } from "@dealpme/connector-remo";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export function createEventSimulator(config: { database: string; apiKey: string; nodeEnv?: string }) {
  if ((config.nodeEnv ?? process.env["NODE_ENV"]) === "production") throw new Error("Simulateur événementiel interdit en production");
  if (config.apiKey.length < 16) throw new Error("Clé locale trop courte");
  const db = new DatabaseSync(config.database);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, payload TEXT, digest TEXT, cancelled INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS admissions (digest TEXT PRIMARY KEY, event_id TEXT NOT NULL, user_id TEXT NOT NULL, display_name TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS attendance (event_id TEXT NOT NULL,user_id TEXT NOT NULL,joined_at TEXT NOT NULL,PRIMARY KEY(event_id,user_id));`);
  let control: { mode: string; requestKey: string } | null = null;
  const server = createServer(async (req, res) => {
    const send = (code: number, value: unknown) => { res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" }); res.end(JSON.stringify(value)); };
    const host = req.headers.host?.split(":")[0];
    if (!host || !["127.0.0.1", "localhost", "event-simulator"].includes(host) || req.headers.origin) { send(403, { error: "LOCAL_ONLY" }); return; }
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/health") { send(200, { status: "ok", simulated: true }); return; }
    if (req.method === "GET" && url.pathname === "/room.js") { res.writeHead(200, { "Content-Type": "text/javascript", "Cache-Control": "no-store" }); res.end(readFileSync(resolve(__dirname, "../public/room.js"))); return; }
    const room = url.pathname.match(/^\/rooms\/([a-f0-9]{64})(\/state)?$/);
    if (req.method === "GET" && room) {
      const admission = db.prepare("SELECT a.*,e.payload,e.cancelled FROM admissions a JOIN events e ON a.event_id=e.id WHERE a.digest=?").get(hash(room[1]!));
      if (!admission || admission["cancelled"] || Number(admission["expires_at"]) <= Date.now()) { send(403, { allowed: false, error: "ADMISSION_EXPIRED_OR_REVOKED" }); return; }
      if (room[2]) { send(200, { allowed: true }); return; }
      const event = LocalEventSchema.parse(JSON.parse(String(admission["payload"])));
      db.prepare("INSERT OR IGNORE INTO attendance VALUES(?,?,?)").run(event.requestKey, String(admission["user_id"]), new Date().toISOString());
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; media-src blob:; frame-ancestors 'none'" });
      res.end(`<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width"><title>Salle synthétique</title><body style="font-family:system-ui;max-width:60rem;margin:2rem;padding:1rem;border-top:8px solid ${event.branding.accent}"><h1>${escape(event.title)}</h1><h2>${escape(event.branding.label)}</h2><p>${escape(event.branding.welcome)}</p><p>SIMULATION LOCALE — aucune connexion à Remo, aucune réunion réelle.</p><p>Participant : ${escape(String(admission["display_name"]))}</p><p id="session" data-session="${event.requestKey}">Session ${event.requestKey}</p><label><input id="capture-consent" type="checkbox">J'autorise le prototype à enregistrer le signal audio synthétique de cette session.</label><p><button id="start" disabled>Démarrer le signal et la captation de test</button> <button id="stop" disabled>Arrêter</button></p><p id="status" role="status">Aucune captation en cours.</p><audio id="playback" controls></audio><script src="/room.js"></script></body></html>`);
      return;
    }
    if (req.method !== "POST") { send(404, { error: "NOT_FOUND" }); return; }
    const provided = Buffer.from(hash(req.headers.authorization ?? ""));
    if (!timingSafeEqual(provided, Buffer.from(hash(`Bearer ${config.apiKey}`)))) { send(401, { error: "AUTH_REQUIRED" }); return; }
    const chunks: Buffer[] = []; let size = 0;
    try {
      for await (const chunk of req) { const b = Buffer.from(chunk as Uint8Array); size += b.length; if (size > 16384) { send(413, { error: "TOO_LARGE" }); return; } chunks.push(b); }
      const input: unknown = JSON.parse(Buffer.concat(chunks).toString());
      if (url.pathname === "/test-controls") { control = z.object({ mode: z.enum(["accepted-timeout", "unavailable", "rate-limit"]), requestKey: z.uuid() }).parse(input); send(200, { configured: true }); return; }
      if (url.pathname === "/events") {
        const event = LocalEventSchema.parse(input);
        if (Date.parse(event.endsAt) <= Date.parse(event.startsAt)) { send(400, { error: "INVALID_INTERVAL" }); return; }
        const failure = control?.requestKey === event.requestKey ? control.mode : null; if (failure) control = null;
        if (failure === "unavailable" || failure === "rate-limit") { send(failure === "unavailable" ? 503 : 429, { error: "SIMULATED" }); return; }
        const payload = JSON.stringify(event), digest = hash(payload);
        const previous = db.prepare("SELECT digest,cancelled FROM events WHERE id=?").get(event.requestKey);
        if (previous && (previous["cancelled"] || previous["digest"] !== digest)) { send(409, { error: "KEY_CONFLICT_OR_CANCELLED" }); return; }
        db.prepare("INSERT OR IGNORE INTO events(id,payload,digest) VALUES(?,?,?)").run(event.requestKey, payload, digest);
        const answer = { remoEventId: event.requestKey, joinUrl: "", simulated: true };
        if (failure === "accepted-timeout") { const timer = setTimeout(() => send(200, answer), 35000); res.once("close", () => clearTimeout(timer)); return; }
        send(200, answer); return;
      }
      if (url.pathname === "/cancel") {
        const { requestKey } = z.object({ requestKey: z.uuid() }).parse(input);
        db.prepare("INSERT INTO events(id,cancelled) VALUES(?,1) ON CONFLICT(id) DO UPDATE SET cancelled=1").run(requestKey);
        send(200, { cancelled: true }); return;
      }
      if (url.pathname === "/admissions") {
        const data = z.object({ remoEventId: z.uuid(), externalUserId: z.string().min(1).max(64), displayName: z.string().min(1).max(120) }).parse(input);
        const event = db.prepare("SELECT payload,cancelled FROM events WHERE id=?").get(data.remoEventId);
        if (!event || event["cancelled"]) { send(409, { error: "EVENT_UNAVAILABLE" }); return; }
        const token = randomBytes(32).toString("hex");
        db.prepare("DELETE FROM admissions WHERE expires_at<?").run(Date.now());
        db.prepare("INSERT INTO admissions VALUES(?,?,?,?,?)").run(hash(token), data.remoEventId, data.externalUserId, data.displayName, Date.now() + 90000);
        send(200, { path: `/rooms/${token}` }); return;
      }
      if (url.pathname === "/attendance") {
        const { remoEventId } = z.object({ remoEventId: z.uuid() }).parse(input);
        const rows = db.prepare("SELECT * FROM attendance WHERE event_id=?").all(remoEventId);
        send(200, { events: rows.map((r) => ({ remoEventId, externalUserId: r["user_id"], joinedAt: r["joined_at"] })) }); return;
      }
      send(404, { error: "NOT_FOUND" });
    } catch { if (!res.headersSent) send(400, { error: "INVALID_REQUEST" }); }
  });
  server.requestTimeout = 5000; server.headersTimeout = 5000;
  server.on("close", () => db.close());
  return server;
}
if (require.main === module) {
  const server = createEventSimulator({ database: process.env["EVENT_SIMULATOR_DB"] ?? ":memory:", apiKey: process.env["REMO_LOCAL_API_KEY"] ?? "dealpme-local-events" });
  server.listen(Number(process.env["PORT"] ?? 8028), process.env["HOST"] ?? "127.0.0.1");
  const stop = () => { server.close(); server.closeAllConnections(); }; process.on("SIGINT", stop); process.on("SIGTERM", stop);
}
