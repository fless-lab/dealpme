import { ReceiptSchema, SmsSchema, TransportError, deliverWithRetry, deliveryFor, retryPolicy, validateMessage, type RetryPolicy } from "@dealpme/notifications";
import type { SmsPort } from "../port.js";

export interface GenericHttpConfig {
  baseUrl: string;
  apiKey: string;
  local?: boolean;
  policy?: Partial<RetryPolicy>;
}

async function readReceipt(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new TransportError("RESULT_UNKNOWN");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      size += next.value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new TransportError("RESULT_UNKNOWN"); }
      chunks.push(next.value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new TransportError("RESULT_UNKNOWN"); }
  } finally { reader.releaseLock(); }
}

/** Contrat de passerelle JSON /messages, partagé avec le local ; aucun fournisseur commercial présumé compatible. */
export function createGenericHttpAdapter(config: GenericHttpConfig): SmsPort {
  let base: URL;
  try { base = new URL(config.baseUrl); } catch { throw new TransportError("CONFIGURATION_ERROR"); }
  if (!config.apiKey?.trim() || !["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash || (!config.local && base.protocol !== "https:")) throw new TransportError("CONFIGURATION_ERROR");
  const url = `${base.href.replace(/\/$/, "")}/messages`;
  const policy = retryPolicy(config.policy);
  return {
    async send(input) {
      const msg = validateMessage(SmsSchema, input);
      const delivery = deliveryFor(msg.delivery);
      const body = JSON.stringify({ ...msg, delivery });
      const result = await deliverWithRetry(delivery, policy, async (signal) => {
        let response: Response;
        try {
          response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" }, body, signal, redirect: "error" });
        } catch { throw new TransportError("RESULT_UNKNOWN", true); }
        if (!response.ok) {
          await response.body?.cancel();
          if (response.status === 401 || response.status === 403) throw new TransportError("CONFIGURATION_ERROR");
          if (response.status === 410) throw new TransportError("EXPIRED");
          if (response.status === 429) {
            const retry = Number(response.headers.get("retry-after") ?? 0) * 1000;
            throw new TransportError("RATE_LIMITED", true, Number.isFinite(retry) ? Math.max(0, retry) : 0);
          }
          if (response.status >= 500) throw new TransportError("UNAVAILABLE", true);
          throw new TransportError("RECIPIENT_REJECTED");
        }
        const receipt = ReceiptSchema.safeParse(await readReceipt(response));
        if (!receipt.success) throw new TransportError("RESULT_UNKNOWN");
        if (!config.local && receipt.data.simulated) throw new TransportError("CONFIGURATION_ERROR");
        return receipt.data;
      }, true);
      return { providerRef: result.value.providerRef, status: "ACCEPTED", ...(config.local ? { simulated: true } : {}), attempts: result.attempts };
    },
  };
}
