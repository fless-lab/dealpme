import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { TransportError } from "@dealpme/notifications";
import { InboxError, SmsInbox } from "./inbox.js";

const Query = z.object({
  toE164: z.string().max(20).optional(), category: z.enum(["OTP", "TRANSACTIONAL", "MARKETING"]).optional(),
  correlationId: z.string().max(128).optional(), idempotencyKey: z.string().max(128).optional(),
  since: z.iso.datetime().optional(), cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
}).strict();
const Control = z.object({
  mode: z.enum(["rate-limit", "unavailable", "reject", "timeout", "accepted-timeout", "none"]),
  count: z.number().int().min(1).max(10).default(1),
  delayMs: z.number().int().min(1).max(30000).default(3000),
  correlationId: z.string().max(128).optional(),
}).strict();
export interface InboxServerOptions { apiKey: string; maxMessages?: number; ttlMs?: number; nodeEnv?: string }

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += Buffer.byteLength(chunk);
    if (size > 32768) { req.resume(); throw new InboxError(413, "BODY_TOO_LARGE"); }
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new InboxError(400, "INVALID_JSON"); }
}
function reply(res: ServerResponse, status: number, body: unknown): void {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...(status === 429 ? { "retry-after": "0" } : {}) });
  res.end(JSON.stringify(body));
}
function authenticated(req: IncomingMessage, key: string): boolean {
  const a = Buffer.from(req.headers.authorization ?? ""), b = Buffer.from(`Bearer ${key}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function stall(res: ServerResponse, ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    const finish = () => { clearTimeout(timer); res.removeListener("close", finish); resolve(); };
    const timer = setTimeout(finish, ms);
    res.once("close", finish);
  });
}

export function createInboxServer(options: InboxServerOptions) {
  if ((options.nodeEnv ?? process.env["NODE_ENV"]) === "production") throw new Error("La boîte SMS locale est interdite en production");
  if (!options.apiKey?.trim()) throw new Error("SMS_INBOX_API_KEY manquant");
  const inbox = new SmsInbox(options.maxMessages, options.ttlMs);
  let control: z.infer<typeof Control> | undefined;
  const publicDir = join(__dirname, "../public");
  const assets = new Map([ ["/", ["text/html; charset=utf-8", "index.html"]], ["/app.js", ["text/javascript; charset=utf-8", "app.js"]], ["/styles.css", ["text/css; charset=utf-8", "styles.css"]] ]);
  const server = createServer((req, res) => {
    res.setHeader("cache-control", "no-store"); res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'");
    void (async () => {
      let url: URL, origin: URL;
      try { origin = new URL(`http://${req.headers.host}`); url = new URL(req.url ?? "/", origin); } catch { throw new InboxError(400, "INVALID_URL"); }
      if (origin.username || origin.password || url.origin !== origin.origin || !["localhost", "127.0.0.1", "[::1]", "sms-inbox"].includes(origin.hostname)) throw new InboxError(403, "HOST_REFUSED");
      if (req.headers.origin && req.headers.origin !== url.origin) throw new InboxError(403, "ORIGIN_REFUSED");
      if (req.method === "GET" && url.pathname === "/health") { reply(res, 200, { status: "ok", mode: "local-simulation" }); return; }
      const asset = assets.get(url.pathname);
      if (req.method === "GET" && asset) { res.writeHead(200, { "content-type": asset[0]! }); res.end(readFileSync(join(publicDir, asset[1]!))); return; }
      if (req.method === "GET" && url.pathname === "/messages") {
        const query = Query.safeParse(Object.fromEntries(url.searchParams));
        if (!query.success) throw new InboxError(400, "INVALID_QUERY");
        reply(res, 200, inbox.list(query.data)); return;
      }
      if (req.method === "GET" && url.pathname.startsWith("/messages/")) {
        const item = inbox.get(url.pathname.slice("/messages/".length));
        if (!item) throw new InboxError(404, "NOT_FOUND");
        reply(res, 200, item); return;
      }
      if (!["POST", "DELETE"].includes(req.method ?? "")) throw new InboxError(404, "NOT_FOUND");
      if (!authenticated(req, options.apiKey)) throw new InboxError(401, "AUTHENTICATION_REQUIRED");
      if (req.method === "DELETE" && url.pathname === "/messages") { inbox.clear(); control = undefined; reply(res, 200, { cleared: true }); return; }
      if (req.method === "POST" && url.pathname === "/test-controls") {
        const parsed = Control.safeParse(await readJson(req));
        if (!parsed.success) throw new InboxError(400, "INVALID_CONTROL");
        control = parsed.data.mode === "none" ? undefined : parsed.data;
        reply(res, 200, { configured: true, simulated: true }); return;
      }
      if (req.method === "POST" && url.pathname === "/messages") {
        const input = await readJson(req);
        const correlationId = (input as { delivery?: { correlationId?: string } })?.delivery?.correlationId;
        let fault: z.infer<typeof Control> | undefined;
        if (control && (!control.correlationId || control.correlationId === correlationId)) {
          fault = { ...control }; if (--control.count === 0) control = undefined;
        }
        if (fault?.mode === "rate-limit") throw new InboxError(429, "RATE_LIMITED");
        if (fault?.mode === "unavailable") throw new InboxError(503, "UNAVAILABLE");
        if (fault?.mode === "reject") throw new InboxError(422, "RECIPIENT_REJECTED");
        if (fault?.mode === "timeout") { await stall(res, fault.delayMs); reply(res, 503, { code: "UNAVAILABLE" }); return; }
        const receipt = inbox.accept(input);
        if (fault?.mode === "accepted-timeout") await stall(res, fault.delayMs);
        reply(res, 201, receipt); return;
      }
      throw new InboxError(404, "NOT_FOUND");
    })().catch((error: unknown) => {
      if (error instanceof InboxError) reply(res, error.status, { code: error.code });
      else if (error instanceof TransportError) reply(res, error.code === "EXPIRED" ? 410 : 400, { code: error.code });
      else reply(res, 500, { code: "INTERNAL" });
    });
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000;
  return server;
}

if (require.main === module) {
  const server = createInboxServer({
    apiKey: process.env["SMS_INBOX_API_KEY"] ?? "dealpme-local-sms",
    maxMessages: Number(process.env["SMS_INBOX_MAX_MESSAGES"] ?? 1000),
    ttlMs: Number(process.env["SMS_INBOX_TTL_MS"] ?? 3600000),
  });
  server.listen(Number(process.env["SMS_INBOX_PORT"] ?? 8026), process.env["SMS_INBOX_HOST"] ?? "127.0.0.1");
  const stop = () => { server.closeAllConnections(); server.close(); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
}
