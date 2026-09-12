import type { SmsMessage, SmsPort } from "./port.js";
import { SmsSchema, assertNotExpired, contentHash, deliveryFor, validateMessage, TransportError } from "@dealpme/notifications";

/**
 * Faux connecteur SMS : aucun envoi réseau. Les messages sont conservés en mémoire (tests) et,
 * en développement uniquement, écrits sur la sortie standard. Les codes OTP n'apparaissent jamais dans les journaux
 * en production : ce faux ne doit pas y être activé.
 */
export interface SentSms extends SmsMessage {
  providerRef: string;
  sentAt: string;
}

export function createFakeSms(options: { echo?: boolean } = {}): SmsPort & { sent: SentSms[] } {
  const sent: SentSms[] = [];
  let n = 0;
  const keys = new Map<string, { hash: string; providerRef: string }>();
  return {
    sent,
    async send(msg: SmsMessage) {
      validateMessage(SmsSchema, msg);
      const delivery = deliveryFor(msg.delivery); assertNotExpired(delivery);
      const hash = contentHash([msg.toE164, msg.text, msg.category, delivery.expiresAt ?? null]);
      const previous = keys.get(delivery.idempotencyKey);
      if (previous && previous.hash !== hash) throw new TransportError("INVALID_MESSAGE");
      if (previous) return { providerRef: previous.providerRef, status: "ACCEPTED", simulated: true };
      n += 1;
      const providerRef = `fake-sms-${n}`;
      keys.set(delivery.idempotencyKey, { hash, providerRef });
      sent.push({ ...msg, providerRef, sentAt: new Date().toISOString() });
      if (options.echo) {
        // eslint-disable-next-line no-console
        console.log(`[sms:fake] ${providerRef} (${msg.category})`);
      }
      return { providerRef, status: "ACCEPTED", simulated: true };
    },
  };
}

export const PORT_METHODS = ["send"] as const;
