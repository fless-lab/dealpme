import { z } from "zod";
import { RemoError, type RemoPort } from "./port.js";

const PublicImageUrl = z.url().max(2048).refine(v => new URL(v).protocol === "https:" && !new URL(v).username && !new URL(v).password, "URL HTTPS publique attendue");
export const BrandingSchema = z.object({ label: z.string().trim().min(1).max(100), accent: z.string().regex(/^#[0-9a-fA-F]{6}$/), welcome: z.string().max(300), logoUrl: PublicImageUrl.optional(), coverUrl: PublicImageUrl.optional(), welcomeMediaUrl: PublicImageUrl.optional() }).strict();
export const LocalEventSchema = z.object({ requestKey: z.uuid(), title: z.string().min(3).max(200), startsAt: z.iso.datetime(), endsAt: z.iso.datetime(), capacity: z.number().int().min(1).max(5000), branding: BrandingSchema, description: z.string().max(4000).optional() }).strict();
export const AttendanceSchema = z.object({ events: z.array(z.object({ remoEventId: z.string().min(1).max(64), externalUserId: z.string().min(1).max(64), joinedAt: z.iso.datetime(), leftAt: z.iso.datetime().optional() }).strict()).max(500) }).strict();

/** Routes du simulateur local, jamais présentées comme le protocole Remo officiel. */
export function createLocalRemo(config: { baseUrl: string; apiKey: string; timeoutMs?: number }): RemoPort {
  const base = new URL(config.baseUrl);
  if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash || !config.apiKey) throw new Error("Configuration du simulateur événementiel invalide");
  const call = async (path: string, body: unknown) => {
    try {
      const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}${path}`, { method: "POST", redirect: "error", signal: AbortSignal.timeout(config.timeoutMs ?? 3000), headers: { "Content-Type": "application/json", authorization: `Bearer ${config.apiKey}` }, body: JSON.stringify(body) });
      if (!response.ok) { await response.body?.cancel(); throw new RemoError(response.status >= 500 ? "UNKNOWN" : response.status === 429 ? "UNAVAILABLE" : "REJECTED"); }
      const reader = response.body?.getReader(); if (!reader) throw new RemoError("MALFORMED");
      const chunks: Uint8Array[] = []; let length = 0;
      while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.length; if (length > 8192) { await reader.cancel(); throw new RemoError("MALFORMED"); } chunks.push(chunk.value); }
      return JSON.parse(Buffer.concat(chunks).toString()) as unknown;
    } catch (error) { if (error instanceof RemoError) throw error; throw new RemoError("UNKNOWN"); }
  };
  return {
    async createEvent(input) {
      const result = z.object({ remoEventId: z.uuid(), joinUrl: z.string(), simulated: z.literal(true) }).safeParse(await call("/events", LocalEventSchema.parse(input)));
      if (!result.success || result.data.remoEventId !== input.requestKey) throw new RemoError("MALFORMED");
      return result.data;
    },
    async cancelEvent(requestKey) { const result = await call("/cancel", { requestKey }); if (!z.object({ cancelled: z.literal(true) }).safeParse(result).success) throw new RemoError("MALFORMED"); },
    async attendance(remoEventId) { return AttendanceSchema.parse(await call("/attendance", { remoEventId })).events; },
    async participantJoinUrl(remoEventId, externalUserId, displayName) {
      const result = z.object({ path: z.string().regex(/^\/rooms\/[a-f0-9]{64}$/) }).safeParse(await call("/admissions", { remoEventId, externalUserId, displayName }));
      if (!result.success) throw new RemoError("MALFORMED");
      return new URL(result.data.path, config.baseUrl).href;
    },
    verifyWebhook: () => true, // L'API vérifie le HMAC du contrat local avant le cache d'idempotence.
    parseAttendance: (raw) => AttendanceSchema.parse(JSON.parse(raw)).events,
  };
}
