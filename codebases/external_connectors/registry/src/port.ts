/**
 * Registre des entreprises (CFE / RCCM) : mode API si disponible, sinon saisie manuelle supervisée (DP-CCI-011).
 * Ce fichier est le contrat : l'API ne dépend que de ce port, jamais d'un vendeur.
 */
export interface RegistryLookupRequest {
  rccmNumber: string;
}
export interface RegistryLookupResult {
  found: boolean;
  provider: "mock" | "cfe" | "manual";
  synthetic: boolean;
  legalName?: string | undefined;
  legalForm?: string | undefined;
  registrationDate?: string | undefined; // ISO 8601
  status?: string | undefined;
  registeredAddress?: string | undefined;
  officers?: string[] | undefined;
  /** Référence de source obligatoire : identifiant d'appel API, numéro d'échange de fichier ou identifiant de consultation opérateur. */
  sourceRef: string;
  verifiedAt: string; // ISO 8601
}
export interface RegistryPort {
  readonly mode: "api" | "manual";
  readonly provider: "mock" | "cfe" | "manual";
  lookup(req: RegistryLookupRequest): Promise<RegistryLookupResult>;
}

export type RegistryErrorCode = "MANUAL_REQUIRED" | "TIMEOUT" | "RATE_LIMITED" | "UNAVAILABLE" | "MALFORMED";
export class RegistryError extends Error {
  constructor(readonly code: RegistryErrorCode) {
    super(`Consultation registre : ${code}`);
    this.name = "RegistryError";
  }
}

export function normalizeRccm(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}
