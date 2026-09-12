import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";

export const DeliverySchema = z.object({
  idempotencyKey: z.string().min(1).max(128).regex(/^[A-Za-z0-9._:-]+$/),
  correlationId: z.string().min(1).max(128).regex(/^[^\r\n]+$/),
  expiresAt: z.iso.datetime().optional(),
}).strict();
export type Delivery = z.infer<typeof DeliverySchema>;
export interface DeliveryReceipt { providerRef: string; status: "ACCEPTED"; simulated?: boolean; attempts?: number }
export const ReceiptSchema = z.object({ providerRef: z.string().min(1).max(256), status: z.literal("ACCEPTED"), simulated: z.boolean().optional() });
export const SmsSchema = z.object({
  toE164: z.string().regex(/^\+[1-9]\d{7,14}$/),
  text: z.string().min(1).max(4000),
  category: z.enum(["OTP", "TRANSACTIONAL", "MARKETING"]),
  delivery: DeliverySchema.optional(),
}).strict();
export type SmsPayload = z.infer<typeof SmsSchema>;
export const EmailSchema = z.object({
  to: z.email(), subject: z.string().min(1).max(200).regex(/^[^\r\n]+$/),
  text: z.string().min(1).max(200_000), html: z.string().max(400_000).optional(),
  category: z.enum(["TRANSACTIONAL", "MARKETING"]),
  unsubscribeUrl: z.url().refine((v) => /^https?:\/\//.test(v) && !/[\r\n<>]/.test(v)).optional(),
  delivery: DeliverySchema.optional(),
}).strict().refine((m) => m.category !== "MARKETING" || !!m.unsubscribeUrl, "Lien de désinscription obligatoire");
export type EmailPayload = z.infer<typeof EmailSchema>;

export type TransportErrorCode = "CONFIGURATION_ERROR" | "INVALID_MESSAGE" | "RECIPIENT_REJECTED" | "RATE_LIMITED" | "UNAVAILABLE" | "RESULT_UNKNOWN" | "EXPIRED";
export class TransportError extends Error {
  constructor(public readonly code: TransportErrorCode, public readonly retryable = false, public readonly retryAfterMs = 0) {
    super(`Échec du transport : ${code}`); this.name = "TransportError";
  }
}
export function validateMessage<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new TransportError("INVALID_MESSAGE");
  return parsed.data;
}
export function deliveryFor(delivery?: Delivery): Delivery {
  return validateMessage(DeliverySchema, delivery ?? { idempotencyKey: randomUUID(), correlationId: randomUUID() });
}
export function assertNotExpired(delivery: Delivery, now = Date.now()): void {
  if (delivery.expiresAt && Date.parse(delivery.expiresAt) <= now) throw new TransportError("EXPIRED");
}
export function contentHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export interface RetryPolicy { totalTimeoutMs: number; attemptTimeoutMs: number; maxAttempts: number; retryDelayMs: number }
export const DEFAULT_RETRY: RetryPolicy = { totalTimeoutMs: 5000, attemptTimeoutMs: 1500, maxAttempts: 3, retryDelayMs: 100 };
export function retryPolicy(input: Partial<RetryPolicy> = {}): RetryPolicy {
  const policy = { ...DEFAULT_RETRY, ...input };
  if (![policy.totalTimeoutMs, policy.attemptTimeoutMs, policy.maxAttempts].every((n) => Number.isInteger(n) && n > 0)
    || policy.totalTimeoutMs > 60000 || policy.attemptTimeoutMs > policy.totalTimeoutMs || policy.maxAttempts > 5
    || !Number.isInteger(policy.retryDelayMs) || policy.retryDelayMs < 0 || policy.retryDelayMs > 5000) throw new TransportError("CONFIGURATION_ERROR");
  return policy;
}

/** Budget global et expiration partagés entre les tentatives. RESULT_UNKNOWN n'est repris que sur un transport idempotent. */
export async function deliverWithRetry<T>(delivery: Delivery, policy: RetryPolicy, operation: (signal: AbortSignal) => Promise<T>, idempotent: boolean): Promise<{ value: T; attempts: number }> {
  assertNotExpired(delivery);
  const deadline = Math.min(Date.now() + policy.totalTimeoutMs, delivery.expiresAt ? Date.parse(delivery.expiresAt) : Infinity);
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    assertNotExpired(delivery);
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new TransportError("RESULT_UNKNOWN");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(remaining, policy.attemptTimeoutMs));
    let abort: (() => void) | undefined;
    try {
      const timeout = new Promise<never>((_resolve, reject) => {
        abort = () => reject(new TransportError("RESULT_UNKNOWN", idempotent));
        controller.signal.addEventListener("abort", abort, { once: true });
      });
      const value = await Promise.race([operation(controller.signal), timeout]);
      assertNotExpired(delivery);
      return { value, attempts: attempt };
    } catch (error) {
      const failure = error instanceof TransportError ? error : new TransportError("RESULT_UNKNOWN", idempotent);
      const canRetry = failure.code === "RESULT_UNKNOWN" ? idempotent : failure.retryable;
      const pause = Math.max(policy.retryDelayMs * attempt, failure.retryAfterMs);
      if (!canRetry || attempt === policy.maxAttempts || Date.now() + pause >= deadline) throw failure;
      await delay(pause);
    } finally {
      clearTimeout(timer);
      if (abort) controller.signal.removeEventListener("abort", abort);
    }
  }
  throw new TransportError("UNAVAILABLE");
}

/** Estimation d'encodage SMS : unités GSM-7 ou UTF-16/UCS-2, jamais un tarif opérateur. */
export function smsSegments(text: string): { encoding: "GSM-7" | "UCS-2"; units: number; segments: number } {
  const basic = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
  const extended = "^{}\\[~]|€\f";
  let units = 0;
  for (const char of text) {
    if (basic.includes(char)) units++;
    else if (extended.includes(char)) units += 2;
    else return { encoding: "UCS-2", units: text.length, segments: text.length <= 70 ? 1 : Math.ceil(text.length / 67) };
  }
  return { encoding: "GSM-7", units, segments: units <= 160 ? 1 : Math.ceil(units / 153) };
}
