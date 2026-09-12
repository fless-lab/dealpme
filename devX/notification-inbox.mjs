import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) throw new Error("Boîte locale indisponible");
  return response.json();
}

/** Le test récupère le code réellement reçu, par clé de défi, jamais depuis la réponse d'authentification. */
export async function receivedMessage(channel, deliveryKey) {
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(deliveryKey ?? "")) throw new Error("Clé de livraison invalide");
  if (channel === "sms") {
    const base = process.env.SMS_LOCAL_BASE_URL ?? "http://127.0.0.1:8026";
    const data = await get(`${base}/messages?idempotencyKey=${encodeURIComponent(deliveryKey)}`);
    return data.items[0] ?? null;
  }
  if (channel !== "email") throw new Error("Canal inconnu");
  const base = process.env.MAILPIT_API_URL ?? "http://127.0.0.1:8025";
  const prefix = `${createHash("sha256").update(deliveryKey).digest("hex")}@`;
  const messages = await get(`${base}/api/v1/messages?limit=100`);
  const summary = messages.messages.find((m) => m.MessageID?.replace(/[<>]/g, "").startsWith(prefix));
  if (!summary) return null;
  const headers = await get(`${base}/api/v1/message/${summary.ID}/headers`);
  const key = Object.entries(headers).find(([name]) => name.toLowerCase() === "x-dealpme-delivery-key")?.[1];
  if (!Array.isArray(key) || !key.includes(deliveryKey)) throw new Error("En-tête de livraison incohérent");
  const message = await get(`${base}/api/v1/message/${summary.ID}`);
  return { id: summary.ID, text: message.Text, headers, to: message.To, subject: message.Subject, html: message.HTML };
}

export async function readOtp(channel, deliveryKey) {
  const deadline = Date.now() + 6000;
  do {
    const message = await receivedMessage(channel, deliveryKey);
    const code = message?.text.match(/\b\d{6}\b/)?.[0];
    if (code) return code;
    await delay(100);
  } while (Date.now() < deadline);
  throw new Error("Code absent de la boîte locale pour ce défi");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(await readOtp(process.argv[2], process.argv[3])); }
  catch { console.error("Lecture du code dans la boîte locale impossible"); process.exitCode = 1; }
}
