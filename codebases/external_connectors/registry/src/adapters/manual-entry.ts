import { RegistryError, type RegistryPort } from "../port.js";

/** Aucun transport ni secret : la saisie nominative est validée dans le service d'instruction. */
export function createManualEntryAdapter(): RegistryPort {
  return { mode: "manual", provider: "manual", lookup: () => Promise.reject(new RegistryError("MANUAL_REQUIRED")) };
}
