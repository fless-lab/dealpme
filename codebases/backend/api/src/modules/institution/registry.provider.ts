import { createManualEntryAdapter, createMockRegistryAdapter, resolveRegistryConfig, type RegistryPort } from "@dealpme/connector-registry";
import { loadEnv } from "../../config/env.js";

export const REGISTRY_PORT = Symbol("REGISTRY_PORT");

export function registryPortFactory(): RegistryPort {
  const env = loadEnv();
  const config = resolveRegistryConfig({
    NODE_ENV: env.NODE_ENV, CFE_API_ENABLED: env.CFE_API_ENABLED,
    CONNECTOR_REGISTRY_MODE: env.CONNECTOR_REGISTRY_MODE, CONNECTOR_REGISTRY_PROVIDER: env.CONNECTOR_REGISTRY_PROVIDER,
    CFE_API_BASE_URL: env.CFE_API_BASE_URL, CFE_API_TIMEOUT_MS: env.CFE_API_TIMEOUT_MS,
  });
  if (!config.enabled) return createManualEntryAdapter();
  return createMockRegistryAdapter({ baseUrl: config.baseUrl!, timeoutMs: config.timeoutMs });
}
