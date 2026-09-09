import type {
  CertificationDecision,
  DataClassification,
  DealStatus,
  DealType,
  DealVisibility,
  DisclosureTier,
  FeeEventStatus,
  LegalForm,
  RegionCode,
  Role,
  SecurityType,
  SignatureMethod,
  SubscriptionTier,
  TurnoverBand,
} from "./enums.js";
import type { Id } from "./ids.js";
import type { Xof } from "./money.js";

/**
 * Types d'entités du domaine (v0, section 5). Ce fichier décrit la forme métier ;
 * les schémas de base vivent dans codebases/backend/api/src/database/schema et
 * codebases/engine/rps/src/database. Chaque champ porte sa classification en commentaire.
 */

export interface Organisation {
  id: Id;
  name: string; // INTERNAL
  /** Enregistrement d'attribution immuable capturé à la création (DP-FIN-001). */
  attribution: AttributionRecord;
  createdAt: Date;
}

export interface AttributionRecord {
  channel: string; // INTERNAL : canal d'acquisition
  campaignId: string | null; // INTERNAL
  referralCode: string | null; // INTERNAL
  cciMemberConfirmationRef: string | null; // INTERNAL : référence de confirmation, jamais la base des membres
  capturedAt: Date;
}

export interface User {
  id: Id;
  organisationId: Id;
  personId: Id;
  email: string; // PERSONAL
  phoneE164: string | null; // PERSONAL, défaut +228
  roles: Role[];
  createdAt: Date;
}

/** Unité réglementaire du comptage de divulgation : une personne, pas un compte ni une session. */
export interface Person {
  id: Id;
  legalName: string; // PERSONAL
  relatedPersonGroupId: Id | null; // INTERNAL : personnes liées comptées une seule fois
}

export interface Company {
  id: Id;
  legalName: string; // INTERNAL
  legalForm: LegalForm; // INTERNAL
  rccmNumber: string | null; // INTERNAL
  registryRecordId: Id | null; // vérification CFE / RCCM, stockée séparément des données déclarées
}

/** Données vérifiées auprès du registre (DP-CCI-005). Jamais fusionnées avec les données déclarées. */
export interface RegistryRecord {
  id: Id;
  rccmNumber: string;
  legalName: string;
  legalForm: LegalForm;
  registrationDate: Date | null;
  status: string;
  registeredAddress: string | null;
  officers: string[];
  verifiedAt: Date;
  verifiedBy: Id;
  sourceRef: string; // référence de la source (API, échange de fichier ou consultation opérateur)
}

export interface Deal {
  id: Id;
  companyId: Id;
  sellerOrganisationId: Id;
  dealType: DealType; // INTERNAL, immuable après création
  status: DealStatus; // INTERNAL
  visibility: DealVisibility; // INTERNAL
  sectorCode: string; // PUBLIC
  regionCode: RegionCode; // PUBLIC
  turnoverBand: TurnoverBand; // PUBLIC
  askingPrice: Xof | null; // CONFIDENTIAL_DEAL, T2 uniquement, jamais sérialisé sous T2
  valuationBasis: string | null; // CONFIDENTIAL_DEAL, T2 uniquement, doit nommer méthode et source
  disclosureCount: number; // INTERNAL, maintenu par le RPS, non modifiable par l'application
  circleCap: number; // INTERNAL, défaut 50
  createdAt: Date;
}

export interface AssetDealDetail {
  dealId: Id;
  assetsDescription: string; // CONFIDENTIAL_DEAL
  includesGoodwill: boolean;
}

export interface ShareDealDetail {
  dealId: Id;
  legalForm: LegalForm; // INTERNAL, pilote DP-RPS-003
  apeEligible: boolean; // dérivé : vrai uniquement si SA et autorisation confirmée
  securityType: SecurityType; // CONFIDENTIAL_DEAL
  stakePercent: number; // CONFIDENTIAL_DEAL, T2 uniquement
  transferRestrictions: string | null; // CONFIDENTIAL_DEAL : clauses d'agrément, préemption ; à faire remonter tôt
}

export interface DealEvent {
  id: Id;
  dealId: Id;
  from: DealStatus | null;
  to: DealStatus;
  actorUserId: Id | null;
  reason: string | null;
  occurredAt: Date;
}

/** Table critique de conformité : append-only, la révocation écrit une nouvelle ligne. */
export interface Disclosure {
  id: Id;
  dealId: Id;
  personId: Id;
  tier: DisclosureTier;
  grantedAt: Date;
  grantedBy: Id | null; // obligatoire à partir de T1 (décision humaine)
  basis: string; // justification enregistrée
  relatedPersonGroupId: Id | null;
  revokedAt: Date | null;
}

export interface Certification {
  id: Id;
  companyId: Id;
  scopeStatement: string; // ce qui est vérifié et ce qui ne l'est pas, texte visible sur le badge
  decision: CertificationDecision;
  officerUserId: Id; // décision nominative obligatoire (DP-CCI-006)
  decidedAt: Date;
  expiresAt: Date | null;
  revocationReason: string | null;
}

export interface Subscription {
  id: Id;
  organisationId: Id;
  tier: SubscriptionTier;
  periodStart: Date;
  periodEnd: Date;
  paymentState: "PAID" | "GRACE_READ_ONLY" | "GRACE_TEASER_ONLY" | "SUSPENDED";
}

export interface SignatureEvidence {
  id: Id;
  ndaInstanceId: Id;
  method: SignatureMethod;
  providerRef: string | null;
  certificateChain: string | null; // stockée, pas seulement validée à la signature
  timestampToken: string | null;
  documentHashSha256: string;
  archiveRef: string | null; // référence PSAE
}

export interface FeeEvent {
  id: Id;
  dealId: Id;
  basisAmount: Xof;
  tierRatePercent: number;
  minimumApplied: boolean;
  platformShareXof: Xof;
  institutionShareXof: Xof;
  status: FeeEventStatus;
  createdAt: Date;
}

/** Métadonnée de classification utilisable dans les schémas et les migrations. */
export interface ClassifiedField {
  name: string;
  classification: DataClassification;
}
