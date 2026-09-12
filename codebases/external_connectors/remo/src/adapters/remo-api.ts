import { z } from "zod";
import { RemoError, type RemoEvent, type RemoEventRequest, type RemoPort } from "../port.js";
import { LocalEventSchema } from "../local.js";

const RemoteId = z.string().regex(/^[a-f0-9]{24}$/i);
const Code = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_-]+$/);
// Le schéma décrit un booléen ; l'exemple officiel attendees emploie la chaîne "true".
const Success = z.union([z.literal(true), z.literal("true")]);
const Epoch = z.union([z.number().int().nonnegative().max(8640000000000000), z.iso.datetime()]).transform(v => typeof v === "number" ? new Date(v).toISOString() : v);
const EventSchema = z.object({
  _id: RemoteId, code: Code, name: z.string().min(1).max(200),
  company: z.union([RemoteId, z.object({ _id: RemoteId })]).transform(v => typeof v === "string" ? v : v._id),
  startTime: z.number().int().positive().max(8640000000000000), endTime: z.number().int().positive().max(8640000000000000), isPrivate: z.boolean(),
  description: z.string().optional(), logoURL: z.string().optional(),
});
const AttendeeSchema = z.object({
  user: z.object({ id: z.string().optional(), email: z.email() }), role: z.string(), isBlocked: z.boolean().optional(),
  sessionData: z.object({ enteredEventAt: Epoch, leftEventAt: Epoch.nullish() }).nullish(),
});
export interface RemoteEvent extends RemoEvent {
  code: string; companyId: string; title: string; startsAt: string; endsAt: string; isPrivate: boolean;
}
export interface RemoteAttendee {
  email: string; remoteUserId: string | null; role: string; blocked: boolean; joinedAt: string | null; leftAt: string | null;
}
export interface RemoApiPort extends RemoPort {
  getEvent(eventId: string): Promise<RemoteEvent>;
  updateEvent(eventId: string, input: Pick<RemoEventRequest, "title" | "description" | "branding">): Promise<void>;
  addMembers(eventId: string, emails: string[], role: "attendee" | "speaker"): Promise<void>;
  attendees(eventId: string): Promise<RemoteAttendee[]>;
  changeGroup(eventId: string, code: string, email: string, add: boolean): Promise<void>;
  attendanceReport(hostEmail: string, from: string, to: string): Promise<{ attendeeEmail: string; eventUrl: string; loginTime: string; logoutTime: string | null; role: string; attended: boolean }[]>;
  discover(query: string, count?: number, offset?: number): Promise<{ id: string; code: string; title: string }[]>;
}
export interface RemoApiConfig {
  apiKey: string;
  companyId: string;
  baseUrl?: string;
  eventBaseUrl?: string;
  floorTemplate?: string;
  floorTheme?: string;
  timeoutMs?: number;
  /** Uniquement pour les tests HTTP de contrat, jamais configurable dans l'environnement applicatif. */
  localContractTest?: boolean;
}

/** Adaptateur du Swagger public figé dans contracts/openapi.json. Aucune reprise implicite des mutations. */
export function createRemoApiAdapter(config: RemoApiConfig): RemoApiPort {
  const base = new URL(config.baseUrl ?? "https://api.virtual.events.com/api/v1");
  const entry = new URL(config.eventBaseUrl ?? "https://virtual.events.com");
  const localTest = config.localContractTest === true && process.env["NODE_ENV"] === "test" && base.hostname === "127.0.0.1";
  if ((!localTest && base.protocol !== "https:") || base.username || base.password || base.search || base.hash || !/^\/api\/v1\/?$/.test(base.pathname)) throw new Error("URL API Remo HTTPS /api/v1 attendue");
  if (entry.protocol !== "https:" || entry.username || entry.password || entry.search || entry.hash || entry.pathname !== "/") throw new Error("Origine de connexion Remo HTTPS attendue");
  RemoteId.parse(config.companyId);
  if (!config.apiKey.trim() || /[\r\n]/.test(config.apiKey)) throw new Error("App Token Remo invalide");
  const timeoutMs = config.timeoutMs ?? 5000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) throw new Error("Délai Remo invalide");
  const pathId = (id: string) => RemoteId.parse(id);
  const call = async (method: string, path: string, body?: unknown) => {
    try {
      const response = await fetch(base.href.replace(/\/$/, "") + path, {
        method, redirect: "error", signal: AbortSignal.timeout(timeoutMs),
        headers: { Authorization: `Token: ${config.apiKey}`, Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        const retry = Number(response.headers.get("retry-after"));
        throw new RemoError(response.status === 401 ? "AUTHENTICATION" : response.status === 403 ? "FORBIDDEN" : response.status === 404 ? "NOT_FOUND" : response.status === 429 ? "RATE_LIMITED" : response.status >= 500 ? (method === "GET" ? "UNAVAILABLE" : "UNKNOWN") : "REJECTED", Number.isFinite(retry) ? Math.min(Math.max(retry, 0) * 1000, 300000) : 0);
      }
      const reader = response.body?.getReader(); if (!reader) throw new RemoError("MALFORMED");
      const chunks: Uint8Array[] = []; let length = 0;
      while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.length; if (length > 8 * 1024 * 1024) { await reader.cancel(); throw new RemoError("MALFORMED"); } chunks.push(chunk.value); }
      return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
    } catch (error) {
      if (error instanceof RemoError) throw error;
      throw new RemoError(method === "GET" ? "UNAVAILABLE" : "UNKNOWN");
    }
  };
  const parse = <T>(schema: z.ZodType<T>, value: unknown): T => { const result = schema.safeParse(value); if (!result.success) throw new RemoError("MALFORMED"); return result.data; };
  const ok = (value: unknown) => parse(z.object({ isSuccess: Success }), value);
  const event = (value: unknown): RemoteEvent => {
    const { event: e } = parse(z.object({ isSuccess: Success, event: EventSchema }), value);
    if (e.company !== config.companyId || e.endTime <= e.startTime) throw new RemoError("MALFORMED");
    return { remoEventId: e._id, code: e.code, companyId: e.company, title: e.name, startsAt: new Date(e.startTime).toISOString(), endsAt: new Date(e.endTime).toISOString(), isPrivate: e.isPrivate, simulated: false, joinUrl: new URL(`/e/${e.code}`, entry).href };
  };
  const content = (input: Pick<RemoEventRequest, "title" | "description" | "branding">) => ({
    name: input.title, description: input.description ?? "", isEventBrandingEnabled: !!input.branding.logoUrl,
    eventBrandingLogoURL: input.branding.logoUrl ?? "",
    logoURL: input.branding.coverUrl ?? "",
    ...(input.branding.welcomeMediaUrl ? { welcomeMessage: { title: input.branding.label, message: input.branding.welcome, mediaURL: input.branding.welcomeMediaUrl, mediaType: "image" }, isTextDefault: false, isMediaDefault: false } : { isTextDefault: true, isMediaDefault: true }),
  });
  const port: RemoApiPort = {
    async createEvent(input) {
      const req = LocalEventSchema.parse(input);
      const created = event(await call("POST", `/companies/${config.companyId}/events`, {
        ...content(req), code: `dealpme-${req.requestKey}`, startTime: Date.parse(req.startsAt), endTime: Date.parse(req.endsAt),
        // Le catalogue DealPME peut être public ; l'entrée chez Remo reste sur invitation.
        isPrivate: true, isDiscoveryOptedOut: true, eventType: "other", eventOutcome: "other",
        isOverflowSeatingDisabled: true, isUserIdDisplayed: false, contactChannels: [],
        theaters: [{ capacity: req.capacity, template: config.floorTemplate ?? "PHOTOREALISTIC-PHOTO-REALISTIC", theme: config.floorTheme ?? "REALISTIC" }],
      }));
      if (!created.isPrivate || Date.parse(created.startsAt) !== Date.parse(req.startsAt) || Date.parse(created.endsAt) !== Date.parse(req.endsAt)) throw new RemoError("MALFORMED");
      return created;
    },
    async getEvent(id) { const result = event(await call("GET", `/events/${pathId(id)}`)); if (result.remoEventId !== id) throw new RemoError("MALFORMED"); return result; },
    async updateEvent(id, input) { ok(await call("PUT", `/events/${pathId(id)}`, content(input))); },
    async cancelEvent(id) { ok(await call("DELETE", `/events/${pathId(id)}`)); },
    async addMembers(id, emails, role) { ok(await call("POST", `/events/${pathId(id)}/members`, { emails: z.array(z.email()).min(1).max(100).parse(emails), role: z.enum(["attendee", "speaker"]).parse(role) })); },
    async attendees(id) {
      const data = parse(z.object({ isSuccess: Success, attendees: z.array(AttendeeSchema).max(5000) }), await call("GET", `/events/${pathId(id)}/attendees?include=attendance`));
      return data.attendees.map(a => ({ email: a.user.email, remoteUserId: a.user.id ?? null, role: a.role, blocked: a.isBlocked ?? false, joinedAt: a.sessionData?.enteredEventAt ?? null, leftAt: a.sessionData?.leftEventAt ?? null }));
    },
    async changeGroup(id, code, email, add) { ok(await call(add ? "POST" : "DELETE", `/events/${pathId(id)}/groups/${encodeURIComponent(Code.parse(code))}/attendees`, { emailId: z.email().parse(email) })); },
    async attendanceReport(hostEmail, from, to) {
      const query = new URLSearchParams({ hostEmail: z.email().parse(hostEmail), from: z.iso.datetime().parse(from), to: z.iso.datetime().parse(to) });
      if (Date.parse(from) > Date.parse(to)) throw new RemoError("REJECTED");
      return parse(z.object({ attendances: z.array(z.object({ attendeeEmail: z.email(), eventUrl: z.url(), loginTime: z.iso.datetime(), logoutTime: z.iso.datetime().nullable(), role: z.string(), attended: z.boolean() })).max(10000) }), await call("GET", `/events/attendance?${query}`)).attendances;
    },
    async discover(query, count = 9, offset = 0) {
      const params = new URLSearchParams({ query: z.string().max(200).parse(query), count: String(z.number().int().min(1).max(100).parse(count)), offset: String(z.number().int().nonnegative().parse(offset)), order: "desc" });
      return parse(z.object({ events: z.array(z.object({ id: RemoteId, code: Code, title: z.string() })).max(100) }), await call("GET", `/events/discovery?${params}`)).events;
    },
    async participantJoinUrl() { throw new RemoError("DISABLED"); },
    async attendance() { throw new RemoError("DISABLED"); }, // L'email est rapproché par l'application, jamais traité comme un UUID DealPME.
    verifyWebhook: () => false, // Aucun webhook n'est décrit par ce Swagger. Ne pas accepter le HMAC du simulateur en mode réel.
    parseAttendance: () => { throw new RemoError("DISABLED"); },
  };
  return port;
}
