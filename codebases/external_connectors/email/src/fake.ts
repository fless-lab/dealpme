import type { EmailMessage, EmailPort } from "./port.js";
import { EmailSchema, assertNotExpired, contentHash, deliveryFor, validateMessage, TransportError } from "@dealpme/notifications";

/** Faux connecteur email : mémoire et, en développement, sortie standard. Un message MARKETING sans lien de désinscription est refusé. */
export interface SentEmail extends EmailMessage {
  providerRef: string;
  sentAt: string;
}

export function createFakeEmail(options: { echo?: boolean } = {}): EmailPort & { sent: SentEmail[] } {
  const sent: SentEmail[] = [];
  let n = 0;
  const keys = new Map<string, { hash: string; providerRef: string }>();
  return {
    sent,
    async send(msg: EmailMessage) {
      validateMessage(EmailSchema, msg);
      const delivery = deliveryFor(msg.delivery); assertNotExpired(delivery);
      const hash = contentHash([msg.to, msg.subject, msg.text, msg.html ?? null, msg.category, msg.unsubscribeUrl ?? null, delivery.expiresAt ?? null]);
      const previous = keys.get(delivery.idempotencyKey);
      if (previous && previous.hash !== hash) throw new TransportError("INVALID_MESSAGE");
      if (previous) return { providerRef: previous.providerRef, status: "ACCEPTED", simulated: true };
      n += 1;
      const providerRef = `fake-email-${n}`;
      keys.set(delivery.idempotencyKey, { hash, providerRef });
      sent.push({ ...msg, providerRef, sentAt: new Date().toISOString() });
      if (options.echo) {
        // eslint-disable-next-line no-console
        console.log(`[email:fake] ${providerRef} (${msg.category})`);
      }
      return { providerRef, status: "ACCEPTED", simulated: true };
    },
  };
}

export const PORT_METHODS = ["send"] as const;
