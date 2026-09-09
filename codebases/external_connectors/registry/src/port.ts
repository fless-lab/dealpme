/**
 * Registre des entreprises (CFE / RCCM) : mode API si disponible, sinon saisie manuelle supervisée (DP-CCI-011).
 * Ce fichier est le contrat : l'API ne dépend que de ce port, jamais d'un vendeur.
 */
export interface RegistryLookupRequest {
  rccmNumber: string;
}
export interface RegistryLookupResult {
  found: boolean;
  legalName?: string;
  legalForm?: string;
  registrationDate?: string; // ISO 8601
  status?: string;
  registeredAddress?: string;
  officers?: string[];
  /** Référence de source obligatoire : identifiant d'appel API, numéro d'échange de fichier ou identifiant de consultation opérateur. */
  sourceRef: string;
  verifiedAt: string; // ISO 8601
}
export interface RegistryPort {
  readonly mode: "api" | "manual";
  lookup(req: RegistryLookupRequest): Promise<RegistryLookupResult>;
}
