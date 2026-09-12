import { randomUUID } from "node:crypto";
import { SmsSchema, assertNotExpired, contentHash, smsSegments, validateMessage, type DeliveryReceipt, type SmsPayload } from "@dealpme/notifications";

export class InboxError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}
export interface InboxMessage extends SmsPayload {
  id: string;
  sequence: number;
  receivedAt: string;
  retentionUntil: number;
  simulated: true;
  state: "SIMULATED_ACCEPTED";
  encoding: "GSM-7" | "UCS-2";
  units: number;
  segments: number;
}

/** Mémoire bornée et réinitialisable : outil de test, pas journal de livraison opérateur. */
export class SmsInbox {
  private readonly messages = new Map<string, InboxMessage>();
  private readonly keys = new Map<string, { hash: string; id: string }>();
  private sequence = 0;
  constructor(private readonly maxMessages = 1000, private readonly ttlMs = 3600000, private readonly now = Date.now) {
    if (!Number.isInteger(maxMessages) || maxMessages < 1 || maxMessages > 10000 || !Number.isFinite(ttlMs) || ttlMs < 100 || ttlMs > 86400000) throw new Error("Configuration de boîte invalide");
  }

  prune(): void {
    for (const [id, message] of this.messages) {
      if (message.retentionUntil > this.now()) continue;
      this.messages.delete(id);
      if (message.delivery) this.keys.delete(message.delivery.idempotencyKey);
    }
  }
  accept(input: unknown): DeliveryReceipt & { replayed: boolean } {
    this.prune();
    const msg = validateMessage(SmsSchema, input);
    if (!msg.delivery) throw new InboxError(400, "DELIVERY_KEY_REQUIRED");
    assertNotExpired(msg.delivery, this.now());
    const hash = contentHash([msg.toE164, msg.text, msg.category, msg.delivery.expiresAt ?? null]);
    const previous = this.keys.get(msg.delivery.idempotencyKey);
    if (previous) {
      if (previous.hash !== hash) throw new InboxError(409, "IDEMPOTENCY_CONFLICT");
      return { providerRef: previous.id, status: "ACCEPTED", simulated: true, replayed: true };
    }
    if (this.messages.size >= this.maxMessages) throw new InboxError(429, "INBOX_FULL");
    const id = randomUUID();
    const message: InboxMessage = { ...msg, id, sequence: ++this.sequence, receivedAt: new Date(this.now()).toISOString(), retentionUntil: this.now() + this.ttlMs, state: "SIMULATED_ACCEPTED", simulated: true, ...smsSegments(msg.text) };
    this.messages.set(id, message); this.keys.set(msg.delivery.idempotencyKey, { hash, id });
    return { providerRef: id, status: "ACCEPTED", simulated: true, replayed: false };
  }
  get(id: string): InboxMessage | undefined { this.prune(); return this.messages.get(id); }
  list(query: { toE164?: string | undefined; category?: string | undefined; correlationId?: string | undefined; idempotencyKey?: string | undefined; since?: string | undefined; cursor?: number | undefined; limit: number }) {
    this.prune();
    const messages = [...this.messages.values()].filter((m) =>
      (!query.toE164 || m.toE164 === query.toE164) && (!query.category || m.category === query.category)
      && (!query.correlationId || m.delivery?.correlationId === query.correlationId)
      && (!query.idempotencyKey || m.delivery?.idempotencyKey === query.idempotencyKey)
      && (!query.since || m.receivedAt >= query.since) && (!query.cursor || m.sequence < query.cursor),
    ).sort((a, b) => b.sequence - a.sequence);
    const items = messages.slice(0, query.limit);
    return { items, total: messages.length, nextCursor: messages.length > query.limit ? items.at(-1)!.sequence : null, simulated: true };
  }
  clear(): void { this.messages.clear(); this.keys.clear(); }
}
