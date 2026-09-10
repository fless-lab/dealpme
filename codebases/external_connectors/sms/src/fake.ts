import type { SmsMessage, SmsPort } from "./port.js";

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
  return {
    sent,
    async send(msg: SmsMessage) {
      n += 1;
      const providerRef = `fake-sms-${n}`;
      sent.push({ ...msg, providerRef, sentAt: new Date().toISOString() });
      if (options.echo) {
        // eslint-disable-next-line no-console
        console.log(`[sms:fake] -> ${msg.toE164} (${msg.category}) : ${msg.text}`);
      }
      return { providerRef };
    },
  };
}

export const PORT_METHODS = ["send"] as const;
