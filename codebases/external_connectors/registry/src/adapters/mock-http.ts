import { z } from "zod";
import { normalizeRccm, RegistryError, type RegistryLookupResult, type RegistryPort } from "../port.js";

const Result = z.object({
  found: z.boolean(), provider: z.literal("mock"), synthetic: z.literal(true),
  rccmNumber: z.string().min(3).max(64),
  legalName: z.string().trim().min(1).max(200).optional(),
  legalForm: z.enum(["SA", "SARL", "SAS", "SNC", "SCS", "GIE", "SOCIETE_CIVILE", "AUTRE"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "STRUCK_OFF", "UNKNOWN"]).optional(),
  registeredAddress: z.string().max(2000).optional(), officers: z.array(z.string().max(200)).max(50).optional(),
  sourceRef: z.string().min(3).max(200), verifiedAt: z.iso.datetime(),
}).strict();

/** Contrat du simulateur uniquement. Aucune route de l'administration n'est présumée. */
export function createMockRegistryAdapter(config: { baseUrl: string; timeoutMs: number }): RegistryPort {
  return {
    mode: "api", provider: "mock",
    async lookup(request): Promise<RegistryLookupResult> {
      const rccmNumber = normalizeRccm(request.rccmNumber);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/lookups`, {
          method: "POST", redirect: "error", signal: controller.signal,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rccmNumber }),
        });
        if (!response.ok) {
          await response.body?.cancel();
          throw new RegistryError(response.status === 429 ? "RATE_LIMITED" : "UNAVAILABLE");
        }
        const reader = response.body?.getReader();
        if (!reader) throw new RegistryError("MALFORMED");
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.length;
          if (size > 16384) { await reader.cancel(); throw new RegistryError("MALFORMED"); }
          chunks.push(chunk.value);
        }
        let parsed: z.infer<typeof Result>;
        try { parsed = Result.parse(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
        catch { throw new RegistryError("MALFORMED"); }
        if (parsed.rccmNumber !== rccmNumber || Date.parse(parsed.verifiedAt) > Date.now() + 60000 || Date.parse(parsed.verifiedAt) < Date.now() - 300000) throw new RegistryError("MALFORMED");
        return parsed;
      } catch (error) {
        if (controller.signal.aborted) throw new RegistryError("TIMEOUT");
        if (error instanceof RegistryError) throw error;
        throw new RegistryError("UNAVAILABLE");
      } finally { clearTimeout(timer); }
    },
  };
}
