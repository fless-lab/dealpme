export interface RegistryConfig {
  enabled: boolean;
  provider: "mock" | "cfe";
  baseUrl?: string;
  timeoutMs: number;
}

/** Le réglage historique n'est utilisé qu'en l'absence du nouveau ; les conflits sont refusés. */
export function resolveRegistryConfig(source: Record<string, string | undefined>): RegistryConfig {
  const flag = source["CFE_API_ENABLED"];
  const legacy = source["CONNECTOR_REGISTRY_MODE"];
  if (flag !== undefined && flag !== "true" && flag !== "false") throw new Error("CFE_API_ENABLED : true ou false attendu");
  if (legacy !== undefined && legacy !== "manual" && legacy !== "api") throw new Error("CONNECTOR_REGISTRY_MODE : manual ou api attendu");
  const enabled = flag === undefined ? legacy === "api" : flag === "true";
  if (flag !== undefined && legacy !== undefined && enabled !== (legacy === "api")) throw new Error("CFE_API_ENABLED et CONNECTOR_REGISTRY_MODE en conflit");
  const provider = source["CONNECTOR_REGISTRY_PROVIDER"] ?? "mock";
  if (provider !== "mock" && provider !== "cfe") throw new Error("CONNECTOR_REGISTRY_PROVIDER inconnu");
  const timeoutMs = Number(source["CFE_API_TIMEOUT_MS"] ?? 3000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 30000) throw new Error("CFE_API_TIMEOUT_MS : entier de 50 à 30000 attendu");
  if (!enabled) return { enabled, provider, timeoutMs };
  if (provider === "cfe") throw new Error("CFE réel non qualifié : contrat fournisseur et adaptateur requis (A02)");
  if (source["NODE_ENV"] === "production") throw new Error("Mock CFE interdit en production");
  const baseUrl = source["CFE_API_BASE_URL"] ?? "http://127.0.0.1:8027";
  const url = new URL(baseUrl);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("CFE_API_BASE_URL : URL HTTP sans identifiants ni paramètres attendue");
  return { enabled, provider, baseUrl, timeoutMs };
}
