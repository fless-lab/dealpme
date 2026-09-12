import { z } from "zod";
import { normalizeRccm, type RegistryLookupResult } from "@dealpme/connector-registry";

export const ManualRegistryResultSchema = z.object({
  legalName: z.string().trim().min(1).max(200),
  legalForm: z.enum(["SA", "SARL", "SAS", "SNC", "SCS", "GIE", "SOCIETE_CIVILE", "AUTRE"]),
  status: z.enum(["ACTIVE", "SUSPENDED", "STRUCK_OFF", "UNKNOWN"]),
  sourceRef: z.string().trim().min(3).max(200),
  decision: z.enum(["CONFIRMED", "DIVERGENT", "NEEDS_INFO", "REFUSED"]).default("CONFIRMED"),
  reason: z.string().trim().min(3).max(2000).optional(),
}).superRefine((value, ctx) => {
  if (value.decision !== "CONFIRMED" && !value.reason) ctx.addIssue({ code: "custom", path: ["reason"], message: "Motif requis" });
});
export type ManualRegistryResult = z.infer<typeof ManualRegistryResultSchema>;
export type DeclaredIdentity = { legalName: string; legalForm: string; rccmNumber: string | null };
const name = (value: string) => value.trim().normalize("NFKC").toUpperCase().replace(/\s+/g, " ");

export function registryOutcome(result: Pick<RegistryLookupResult, "found" | "legalName" | "legalForm" | "status">, declared: DeclaredIdentity, rccm: string) {
  if (!result.found) return "NOT_FOUND";
  if (!result.legalName || !result.legalForm || !result.status || result.status === "UNKNOWN") return "INCOMPLETE";
  if (result.status === "STRUCK_OFF") return "STRUCK_OFF";
  if (result.status !== "ACTIVE") return "SUSPENDED";
  if (name(result.legalName) !== name(declared.legalName) || result.legalForm !== declared.legalForm || normalizeRccm(declared.rccmNumber ?? "") !== normalizeRccm(rccm)) return "DIVERGENT";
  return "CONFIRMED";
}
