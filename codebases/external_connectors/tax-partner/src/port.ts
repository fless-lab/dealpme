/**
 * Module fiscal partenaire (simulation, télédéclaration simplifiée, attestation). Une panne partenaire ne doit jamais produire une fausse attestation. Partenaire à confirmer.
 * Ce fichier est le contrat : l'API ne dépend que de ce port, jamais d'un vendeur.
 */
export interface TaxSimulationRequest {
  taxpayerId: string;
  fiscalYear: number;
  inputs: Record<string, number>;
}
export interface TaxSimulationResult {
  providerRef: string;
  amountsXof: Record<string, number>;
  disclaimer: string; // responsabilité du contenu : partenaire
}
export interface TaxCertificateResult {
  status: "ISSUED" | "PENDING" | "UNAVAILABLE"; // UNAVAILABLE en cas de panne : jamais un succès simulé
  certificateRef?: string;
  issuedAt?: string;
}
export interface TaxPartnerPort {
  simulate(req: TaxSimulationRequest): Promise<TaxSimulationResult>;
  requestCertificate(taxpayerId: string): Promise<TaxCertificateResult>;
  health(): Promise<{ available: boolean }>;
}
