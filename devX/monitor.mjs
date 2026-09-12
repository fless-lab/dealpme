import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createSmtpAdapter } from "@dealpme/connector-email";

/** Une exécution par minute via timer ; état persistant et réception SMTP attestée dans le journal. */
export async function monitor({ baseUrl, stateFile, to, email }) {
  let state;
  try { state = JSON.parse(await readFile(stateFile, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; state = { degraded: false }; }
  let degraded = true;
  try {
    const [health, ready] = await Promise.all(["health", "ready"].map(async (path) => {
      const response = await fetch(`${baseUrl}/${path}`, { signal: AbortSignal.timeout(8000), redirect: "error" });
      return response.ok ? response.json() : null;
    }));
    degraded = health?.status !== "ok" || ready?.ready !== true;
  } catch { /* Incident de disponibilité : le transport de supervision reste indépendant de l'API. */ }
  const save = async () => { await mkdir(dirname(stateFile), { recursive: true, mode: 0o700 }); await writeFile(`${stateFile}.tmp`, JSON.stringify(state), { mode: 0o600 }); await rename(`${stateFile}.tmp`, stateFile); };
  if (state.sending) {
    console.error(JSON.stringify({ service: "monitor", event: "DELIVERY_UNKNOWN", incidentId: state.incidentId }));
    return { degraded, unknown: true };
  }
  if (degraded === state.degraded) return { degraded, notified: false };
  state = { ...state, sending: true, incidentId: randomUUID() }; await save();
  let receipt;
  try {
    receipt = await email.send({ to, subject: degraded ? "DealPME — incident de disponibilité" : "DealPME — service rétabli",
      text: `${degraded ? "Sonde API dégradée ou indisponible." : "Sondes API revenues à la normale."} Référence : ${state.incidentId}. Consulter le journal centralisé.`,
      category: "TRANSACTIONAL", delivery: { idempotencyKey: state.incidentId, correlationId: state.incidentId },
    });
  } catch (error) {
    if (error.code !== "RESULT_UNKNOWN") { state.sending = false; await save(); }
    throw error;
  }
  // Si la persistance échoue après SMTP, conserver le marqueur d'envoi préalable : résultat indéterminé.
  state = { degraded, incidentId: state.incidentId, providerRef: receipt.providerRef, notifiedAt: new Date().toISOString(), sending: false }; await save();
  console.log(JSON.stringify({ service: "monitor", event: degraded ? "INCIDENT_NOTIFIED" : "RECOVERY_NOTIFIED", incidentId: state.incidentId, providerRef: receipt.providerRef }));
  return { degraded, notified: true, id: state.incidentId };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.MONITOR_EMAIL || !process.env.MONITOR_STATE_FILE || !process.env.MONITOR_API_URL) throw new Error("MONITOR_EMAIL, MONITOR_STATE_FILE et MONITOR_API_URL requis");
  const flag = (key) => { const value = process.env[key] ?? "false"; if (!["true", "false"].includes(value)) throw new Error(`${key} invalide`); return value === "true"; };
  const secure = flag("SMTP_SECURE"), requireTLS = flag("SMTP_REQUIRE_TLS");
  if (process.env.NODE_ENV === "production" && (!secure && !requireTLS || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD)) throw new Error("SMTP authentifié et TLS requis pour la supervision");
  await monitor({ baseUrl: process.env.MONITOR_API_URL, stateFile: process.env.MONITOR_STATE_FILE, to: process.env.MONITOR_EMAIL,
    email: createSmtpAdapter({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT), from: process.env.EMAIL_FROM, secure, requireTLS, user: process.env.SMTP_USER || undefined, password: process.env.SMTP_PASSWORD || undefined }),
  });
}
