import SMTPConnection from "nodemailer/lib/smtp-connection";
import MailComposer from "nodemailer/lib/mail-composer";
import { createHash } from "node:crypto";
import { EmailSchema, TransportError, deliverWithRetry, deliveryFor, retryPolicy, validateMessage, type RetryPolicy } from "@dealpme/notifications";
import type { EmailPort } from "../port.js";

export interface SmtpConfig {
  host: string;
  port: number;
  from: string;
  secure?: boolean;
  requireTLS?: boolean;
  user?: string;
  password?: string;
  policy?: Partial<RetryPolicy>;
}

/** MIME, TLS et authentification gérés par Nodemailer ; la connexion explicite permet un vrai abort. */
export function createSmtpAdapter(config: SmtpConfig): EmailPort {
  const policy = retryPolicy(config.policy);
  if (!config.host?.trim() || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535 || !!config.user !== !!config.password) throw new TransportError("CONFIGURATION_ERROR");
  validateMessage(EmailSchema, { to: config.from, subject: "validation", text: "validation", category: "TRANSACTIONAL" });
  return {
    async send(input) {
      const msg = validateMessage(EmailSchema, input);
      const delivery = deliveryFor(msg.delivery);
      const messageId = `<${createHash("sha256").update(delivery.idempotencyKey).digest("hex")}@${config.from.split("@")[1]}>`;
      const unsubscribe = msg.category === "MARKETING" ? msg.unsubscribeUrl : undefined;
      const escapedUrl = unsubscribe?.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      const mime = await new MailComposer({
        from: config.from, to: msg.to, subject: msg.subject,
        text: unsubscribe ? `${msg.text}\n\nSe désinscrire : ${unsubscribe}` : msg.text,
        ...(msg.html ? { html: `${msg.html}${escapedUrl ? `<p><a href="${escapedUrl}">Se désinscrire</a></p>` : ""}` } : {}),
        messageId, disableFileAccess: true, disableUrlAccess: true,
        headers: { "X-DealPME-Correlation-ID": delivery.correlationId, "X-DealPME-Delivery-Key": delivery.idempotencyKey, ...(unsubscribe ? { "List-Unsubscribe": `<${unsubscribe}>` } : {}) },
      }).compile().build();
      const result = await deliverWithRetry(delivery, policy, (signal) => new Promise<void>((resolve, reject) => {
        const connection = new SMTPConnection({
          host: config.host, port: config.port, secure: config.secure ?? false, requireTLS: config.requireTLS ?? false,
          opportunisticTLS: false, connectionTimeout: policy.attemptTimeoutMs, greetingTimeout: policy.attemptTimeoutMs,
          socketTimeout: policy.attemptTimeoutMs, dnsTimeout: policy.attemptTimeoutMs, logger: false, debug: false,
          tls: { rejectUnauthorized: true },
        });
        let settled = false;
        let sending = false;
        const finish = (error?: unknown) => {
          if (settled) return;
          settled = true; signal.removeEventListener("abort", abort); connection.close();
          if (!error) { resolve(); return; }
          if (error instanceof TransportError) { reject(error); return; }
          const detail = error as { code?: string; responseCode?: number };
          if (detail.code === "EAUTH" || detail.code === "ENOAUTH" || detail.code === "ETLS") reject(new TransportError("CONFIGURATION_ERROR"));
          else if (detail.responseCode && detail.responseCode >= 500) reject(new TransportError("RECIPIENT_REJECTED"));
          else if (detail.responseCode && detail.responseCode >= 400) reject(new TransportError("UNAVAILABLE", true));
          else reject(new TransportError(sending ? "RESULT_UNKNOWN" : "UNAVAILABLE", !sending));
        };
        const abort = () => finish(new TransportError("RESULT_UNKNOWN"));
        const send = () => {
          if (settled) return;
          sending = true;
          connection.send({ from: config.from, to: [msg.to] }, mime, (error, info) => {
            if (error) finish(error);
            else if (!info?.accepted?.length) finish(new TransportError("RECIPIENT_REJECTED"));
            else finish();
          });
        };
        signal.addEventListener("abort", abort, { once: true });
        connection.on("error", finish);
        connection.on("end", () => { if (!settled) finish(new TransportError(sending ? "RESULT_UNKNOWN" : "UNAVAILABLE", !sending)); });
        if (signal.aborted) { abort(); return; }
        connection.connect(() => {
          if (settled) return;
          if (config.user && config.password) connection.login({ user: config.user, pass: config.password }, (error) => error ? finish(error) : send());
          else send();
        });
      }), false); // Un Message-ID SMTP ne garantit pas le dédoublonnage chez le destinataire.
      return { providerRef: messageId, status: "ACCEPTED", attempts: result.attempts };
    },
  };
}
