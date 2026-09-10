import type { EmailMessage, EmailPort } from "./port.js";

/** Faux connecteur email : mémoire et, en développement, sortie standard. Un message MARKETING sans lien de désinscription est refusé. */
export interface SentEmail extends EmailMessage {
  providerRef: string;
  sentAt: string;
}

export function createFakeEmail(options: { echo?: boolean } = {}): EmailPort & { sent: SentEmail[] } {
  const sent: SentEmail[] = [];
  let n = 0;
  return {
    sent,
    async send(msg: EmailMessage) {
      if (msg.category === "MARKETING" && !msg.unsubscribeUrl) {
        throw new Error("Un email marketing exige un lien de désinscription");
      }
      n += 1;
      const providerRef = `fake-email-${n}`;
      sent.push({ ...msg, providerRef, sentAt: new Date().toISOString() });
      if (options.echo) {
        // eslint-disable-next-line no-console
        console.log(`[email:fake] -> ${msg.to} : ${msg.subject}\n${msg.text}`);
      }
      return { providerRef };
    },
  };
}

export const PORT_METHODS = ["send"] as const;
