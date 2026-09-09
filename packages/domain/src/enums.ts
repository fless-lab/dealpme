/**
 * Énumérations du domaine. Valeurs en SCREAMING_SNAKE_CASE, jamais localisées
 * en base ni dans l'API (convention v0, section 9). Les libellés français vivent dans @dealpme/i18n.
 */

/** Bifurcation fondatrice : un deal est typé à la création et ne change jamais de type (DP-RPS-001). */
export const DealType = {
  ASSET_DEAL: "ASSET_DEAL",
  SHARE_DEAL: "SHARE_DEAL",
} as const;
export type DealType = (typeof DealType)[keyof typeof DealType];

/** Visibilité d'un deal. OPEN est réservé aux cessions d'actifs. */
export const DealVisibility = {
  DRAFT: "DRAFT",
  OPEN: "OPEN",
  RESTRICTED_CIRCLE: "RESTRICTED_CIRCLE",
  INVITE_ONLY: "INVITE_ONLY",
  CLOSED: "CLOSED",
} as const;
export type DealVisibility = (typeof DealVisibility)[keyof typeof DealVisibility];

/** Machine à états du deal (v0, section 6.1). Les transitions sont dans @dealpme/rules. */
export const DealStatus = {
  DRAFT: "DRAFT",
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  VERIFIED: "VERIFIED",
  LISTED_OPEN: "LISTED_OPEN",
  LISTED_RESTRICTED: "LISTED_RESTRICTED",
  ENGAGED: "ENGAGED",
  DUE_DILIGENCE: "DUE_DILIGENCE",
  NEGOTIATION: "NEGOTIATION",
  CLOSED_REPORTED: "CLOSED_REPORTED",
  HANDED_OFF: "HANDED_OFF",
  ABANDONED: "ABANDONED",
} as const;
export type DealStatus = (typeof DealStatus)[keyof typeof DealStatus];

/** Paliers de divulgation contrôlés par le RPS. */
export const DisclosureTier = {
  T0: "T0",
  T1: "T1",
  T2: "T2",
} as const;
export type DisclosureTier = (typeof DisclosureTier)[keyof typeof DisclosureTier];

/** Classification obligatoire de chaque champ (DP-OPS-004). Pilote accès, journalisation, rétention, export. */
export const DataClassification = {
  PUBLIC: "PUBLIC",
  INTERNAL: "INTERNAL",
  PERSONAL: "PERSONAL",
  SENSITIVE_PERSONAL: "SENSITIVE_PERSONAL",
  CONFIDENTIAL_DEAL: "CONFIDENTIAL_DEAL",
} as const;
export type DataClassification = (typeof DataClassification)[keyof typeof DataClassification];

/** Formes juridiques OHADA (AUSCGIE). SARL, SAS, SNC, SCS : régime de divulgation le plus strict. */
export const LegalForm = {
  SA: "SA",
  SARL: "SARL",
  SAS: "SAS",
  SNC: "SNC",
  SCS: "SCS",
  GIE: "GIE",
  SOCIETE_CIVILE: "SOCIETE_CIVILE",
  AUTRE: "AUTRE",
} as const;
export type LegalForm = (typeof LegalForm)[keyof typeof LegalForm];

export const SecurityType = {
  ACTIONS: "ACTIONS",
  PARTS_SOCIALES: "PARTS_SOCIALES",
} as const;
export type SecurityType = (typeof SecurityType)[keyof typeof SecurityType];

/** Régions du pilote (v0, section 5.2). Vocabulaire contrôlé, classification PUBLIC. */
export const RegionCode = {
  GRAND_LOME: "GRAND_LOME",
  MARITIME: "MARITIME",
  PLATEAUX: "PLATEAUX",
  CENTRALE: "CENTRALE",
  KARA: "KARA",
  SAVANES: "SAVANES",
} as const;
export type RegionCode = (typeof RegionCode)[keyof typeof RegionCode];

/** Tranches de chiffre d'affaires : seule la tranche est visible sous T2, jamais le montant exact. */
export const TurnoverBand = {
  LT_50M: "LT_50M",
  FROM_50M_TO_250M: "FROM_50M_TO_250M",
  FROM_250M_TO_1B: "FROM_250M_TO_1B",
  GT_1B: "GT_1B",
} as const;
export type TurnoverBand = (typeof TurnoverBand)[keyof typeof TurnoverBand];

/** Personas v0 (section 4). Le rôle LICENSED_PARTNER est dormant tant que le drapeau n'est pas activé. */
export const Role = {
  SELLER: "SELLER",
  INVESTOR: "INVESTOR",
  INVESTOR_DIASPORA: "INVESTOR_DIASPORA",
  ADVISOR: "ADVISOR",
  BANK: "BANK",
  CCI_OFFICER: "CCI_OFFICER",
  EXPERT: "EXPERT",
  COMPLIANCE_OPERATOR: "COMPLIANCE_OPERATOR",
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  LICENSED_PARTNER: "LICENSED_PARTNER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/** Paliers d'abonnement (v0, section 7.1.1). Prépayés, jamais de prélèvement récurrent. */
export const SubscriptionTier = {
  STARTER: "STARTER",
  BUSINESS: "BUSINESS",
  PREMIUM: "PREMIUM",
  ELITE: "ELITE",
} as const;
export type SubscriptionTier = (typeof SubscriptionTier)[keyof typeof SubscriptionTier];

/** Profils d'accès à la data room (matrice d'états d'accès du corpus V3.1). Chaque état contient le précédent. */
export const AccessProfile = {
  GUEST: "GUEST",
  VERIFIED_BUYER: "VERIFIED_BUYER",
  QUALIFIED: "QUALIFIED",
  ADMITTED: "ADMITTED",
  NDA_SIGNED: "NDA_SIGNED",
  AUTHORIZED: "AUTHORIZED",
  REVOKED: "REVOKED",
} as const;
export type AccessProfile = (typeof AccessProfile)[keyof typeof AccessProfile];

/** Résultat d'une tentative d'ouverture de la data room selon le profil (release gate, scénarios obligatoires). */
export const VdrGateResult = {
  LOGIN_REQUIRED: "LOGIN_REQUIRED",
  QUALIFICATION_REQUIRED: "QUALIFICATION_REQUIRED",
  ADMISSION_REQUIRED: "ADMISSION_REQUIRED",
  NDA_REQUIRED: "NDA_REQUIRED",
  T2_GRANT_REQUIRED: "T2_GRANT_REQUIRED",
  VDR_HOME: "VDR_HOME",
  ACCESS_REVOKED: "ACCESS_REVOKED",
} as const;
export type VdrGateResult = (typeof VdrGateResult)[keyof typeof VdrGateResult];

export const SignatureMethod = {
  QUALIFIED_ELECTRONIC: "QUALIFIED_ELECTRONIC",
  WET_INK_COUNTERSIGNED: "WET_INK_COUNTERSIGNED",
} as const;
export type SignatureMethod = (typeof SignatureMethod)[keyof typeof SignatureMethod];

export const CertificationDecision = {
  GRANTED: "GRANTED",
  REFUSED: "REFUSED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const;
export type CertificationDecision = (typeof CertificationDecision)[keyof typeof CertificationDecision];

/** Un FeeEvent est créé à chaque entrée en CLOSED_REPORTED : PENDING si le module de frais est actif, SUSPENDED sinon. */
export const FeeEventStatus = {
  PENDING: "PENDING",
  SUSPENDED: "SUSPENDED",
  SETTLED: "SETTLED",
  CANCELLED: "CANCELLED",
} as const;
export type FeeEventStatus = (typeof FeeEventStatus)[keyof typeof FeeEventStatus];
