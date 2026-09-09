import { createFakeRegistry, type RegistryPort } from "@dealpme/connector-registry";
import { loadEnv } from "../../config/env.js";

export const REGISTRY_PORT = Symbol("REGISTRY_PORT");

/**
 * Sélection de l'adaptateur registre selon l'environnement (DP-CCI-011) :
 * "api" si une API CFE/RCCM existe, sinon "manual" : l'officier CCI saisit le résultat de sa consultation
 * et la source est tracée. Tant que la question de l'API n'est pas tranchée, le mode manuel est le défaut.
 */
export function registryPortFactory(): RegistryPort {
  const env = loadEnv();
  if (env.CONNECTOR_REGISTRY_MODE === "api") {
    // Remplacer par createCfeApiAdapter({...}) lors de l'intégration réelle.
    throw new Error("Mode API du registre non encore intégré : utiliser CONNECTOR_REGISTRY_MODE=manual");
  }
  const manual = createFakeRegistry();
  return {
    mode: "manual",
    lookup: manual.lookup,
  };
}
