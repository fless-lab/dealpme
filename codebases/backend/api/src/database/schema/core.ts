import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar, bigint, index, uniqueIndex, foreignKey, check } from "drizzle-orm/pg-core";

/**
 * Schéma de la base "core" (V1). Conventions v0 : snake_case, UUIDv7, timestamptz UTC, montants en entier XOF,
 * énumérations SCREAMING_SNAKE_CASE. Chaque colonne porte sa classification en commentaire :
 * PUBLIC | INTERNAL | PERSONAL | SENSITIVE_PERSONAL | CONFIDENTIAL_DEAL.
 * Les politiques RLS sont dans drizzle/core/rls.sql (appliquées après les migrations générées).
 */

export const dealTypeEnum = pgEnum("deal_type", ["ASSET_DEAL", "SHARE_DEAL"]);
export const dealStatusEnum = pgEnum("deal_status", [
  "DRAFT", "PENDING_VERIFICATION", "VERIFIED", "LISTED_OPEN", "LISTED_RESTRICTED",
  "ENGAGED", "DUE_DILIGENCE", "NEGOTIATION", "CLOSED_REPORTED", "HANDED_OFF", "ABANDONED",
]);
export const dealVisibilityEnum = pgEnum("deal_visibility", ["DRAFT", "OPEN", "RESTRICTED_CIRCLE", "INVITE_ONLY", "CLOSED"]);
export const legalFormEnum = pgEnum("legal_form", ["SA", "SARL", "SAS", "SNC", "SCS", "GIE", "SOCIETE_CIVILE", "AUTRE"]);
export const regionEnum = pgEnum("region_code", ["GRAND_LOME", "MARITIME", "PLATEAUX", "CENTRALE", "KARA", "SAVANES"]);
export const turnoverBandEnum = pgEnum("turnover_band", ["LT_50M", "FROM_50M_TO_250M", "FROM_250M_TO_1B", "GT_1B"]);
export const certificationDecisionEnum = pgEnum("certification_decision", ["GRANTED", "REFUSED", "REVOKED", "EXPIRED"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", ["STARTER", "BUSINESS", "PREMIUM", "ELITE"]);
export const paymentStateEnum = pgEnum("payment_state", ["PAID", "GRACE_READ_ONLY", "GRACE_TEASER_ONLY", "SUSPENDED"]);
export const feeEventStatusEnum = pgEnum("fee_event_status", ["PENDING", "SUSPENDED", "SETTLED", "CANCELLED"]);

const id = () => uuid("id").primaryKey(); // UUIDv7 généré par l'application (@dealpme/domain newId)
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const organisations = pgTable("organisation", {
  id: id(),
  name: varchar("name", { length: 160 }).notNull(), // INTERNAL
  // Attribution immuable (DP-FIN-001) : un trigger interdit toute mise à jour de ces colonnes (voir rls.sql).
  attributionChannel: varchar("attribution_channel", { length: 64 }).notNull(), // INTERNAL
  attributionCampaignId: varchar("attribution_campaign_id", { length: 64 }), // INTERNAL
  attributionReferralCode: varchar("attribution_referral_code", { length: 64 }), // INTERNAL
  cciMemberConfirmationRef: varchar("cci_member_confirmation_ref", { length: 64 }), // INTERNAL : référence seulement, jamais la base des membres
  attributionCapturedAt: timestamp("attribution_captured_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
});

export const persons = pgTable("person", {
  id: id(),
  legalName: varchar("legal_name", { length: 200 }).notNull(), // PERSONAL
  relatedPersonGroupId: uuid("related_person_group_id"), // INTERNAL : personnes liées comptées une fois par le RPS
  createdAt: createdAt(),
});

export const users = pgTable(
  "app_user",
  {
    id: id(),
    organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
    personId: uuid("person_id").notNull().references(() => persons.id),
    email: varchar("email", { length: 254 }).notNull(), // PERSONAL
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneE164: varchar("phone_e164", { length: 20 }), // PERSONAL
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    passwordHash: text("password_hash").notNull(), // SENSITIVE_PERSONAL : Argon2id
    roles: jsonb("roles").$type<string[]>().notNull().default(sql`'[]'::jsonb`), // INTERNAL
    consentTermsAt: timestamp("consent_terms_at", { withTimezone: true }).notNull(),
    consentPrivacyAt: timestamp("consent_privacy_at", { withTimezone: true }).notNull(),
    consentMarketingAt: timestamp("consent_marketing_at", { withTimezone: true }), // séparé, jamais groupé
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("app_user_email_idx").on(t.email)],
);

/** Sessions côté serveur : expiration, appareils, révocation à distance (DP-IDN). */
export const sessions = pgTable(
  "session",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id),
    tokenHash: text("token_hash").notNull(), // SENSITIVE_PERSONAL : hash du jeton, jamais le jeton
    deviceLabel: varchar("device_label", { length: 120 }), // PERSONAL
    ipHash: varchar("ip_hash", { length: 128 }), // PERSONAL
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("session_user_idx").on(t.userId), uniqueIndex("session_token_idx").on(t.tokenHash)],
);

export const otpChallenges = pgTable("otp_challenge", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id),
  purpose: varchar("purpose", { length: 32 }).notNull(), // LOGIN | PHONE_VERIFY
  codeHash: text("code_hash").notNull(), // SENSITIVE_PERSONAL
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const subscriptions = pgTable("subscription", {
  id: id(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  tier: subscriptionTierEnum("tier").notNull(), // INTERNAL
  entitlementsVersion: varchar("entitlements_version", { length: 32 }).notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  paymentState: paymentStateEnum("payment_state").notNull().default("PAID"),
  createdAt: createdAt(),
});

export const companies = pgTable("company", {
  id: id(),
  ownerOrganisationId: uuid("owner_organisation_id").notNull().references(() => organisations.id),
  legalName: varchar("legal_name", { length: 200 }).notNull(), // INTERNAL : données déclarées par le cédant
  legalForm: legalFormEnum("legal_form").notNull(), // INTERNAL
  rccmNumber: varchar("rccm_number", { length: 64 }), // INTERNAL
  registryRecordId: uuid("registry_record_id"), // vérification stockée séparément (DP-CCI-005)
  createdAt: createdAt(),
});

/** Données vérifiées auprès du registre CFE / RCCM. Jamais fusionnées avec les données déclarées. */
export const registryRecords = pgTable("registry_record", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  rccmNumber: varchar("rccm_number", { length: 64 }).notNull(), // INTERNAL
  legalName: varchar("legal_name", { length: 200 }).notNull(),
  legalForm: legalFormEnum("legal_form").notNull(),
  registrationDate: timestamp("registration_date", { withTimezone: true }),
  status: varchar("status", { length: 64 }).notNull(),
  registeredAddress: text("registered_address"),
  officers: jsonb("officers").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
  verifiedBy: uuid("verified_by").notNull(), // officier CCI ou opérateur
  sourceRef: varchar("source_ref", { length: 200 }).notNull(), // API, échange de fichier ou consultation opérateur
  mode: varchar("mode", { length: 16 }).notNull(), // api | manual
});

/** Consultations append-only : y compris absence, incident et synthétique. Aucun comblement par le déclaratif. */
export const registryConsultations = pgTable("registry_consultation", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  requestId: uuid("request_id").notNull(),
  requestHash: varchar("request_hash", { length: 64 }).notNull(),
  officerUserId: uuid("officer_user_id").notNull(),
  rccmNumber: varchar("rccm_number", { length: 64 }).notNull(),
  declaredIdentity: jsonb("declared_identity").$type<{ legalName: string; legalForm: string; rccmNumber: string | null }>().notNull(),
  mode: varchar("mode", { length: 16 }).notNull(),
  provider: varchar("provider", { length: 32 }).notNull(),
  synthetic: boolean("synthetic").notNull(),
  outcome: varchar("outcome", { length: 32 }).notNull(),
  result: jsonb("result").$type<import("@dealpme/connector-registry").RegistryLookupResult>(),
  reason: varchar("reason", { length: 2000 }),
  fallbackFromId: uuid("fallback_from_id"),
  registryRecordId: uuid("registry_record_id"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("registry_consultation_request_idx").on(t.companyId, t.requestId), index("registry_consultation_company_idx").on(t.companyId, t.createdAt)]);

export const membershipConfirmations = pgTable("membership_confirmation", {
  id: id(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  confirmationRef: varchar("confirmation_ref", { length: 64 }).notNull(), // INTERNAL : la seule chose stockée
  confirmedBy: uuid("confirmed_by").notNull(), // officier CCI-Togo
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deals = pgTable(
  "deal",
  {
    id: id(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    sellerOrganisationId: uuid("seller_organisation_id").notNull().references(() => organisations.id),
    dealType: dealTypeEnum("deal_type").notNull(), // INTERNAL, immuable (trigger dans rls.sql)
    status: dealStatusEnum("status").notNull().default("DRAFT"), // INTERNAL
    visibility: dealVisibilityEnum("visibility").notNull().default("DRAFT"), // INTERNAL
    sectorCode: varchar("sector_code", { length: 16 }).notNull(), // PUBLIC
    regionCode: regionEnum("region_code").notNull(), // PUBLIC
    turnoverBand: turnoverBandEnum("turnover_band").notNull(), // PUBLIC : jamais le montant exact sous T2
    askingPriceEnc: text("asking_price_enc"), // CONFIDENTIAL_DEAL, T2 uniquement, chiffré AES-256-GCM (FieldCrypto), jamais en clair en base
    valuationBasisEnc: text("valuation_basis_enc"), // CONFIDENTIAL_DEAL, T2 uniquement, chiffré
    disclosureCount: integer("disclosure_count").notNull().default(0), // INTERNAL : maintenu par le RPS uniquement
    circleCap: integer("circle_cap").notNull().default(50), // INTERNAL
    createdAt: createdAt(),
  },
  (t) => [index("deal_search_idx").on(t.status, t.sectorCode, t.regionCode, t.turnoverBand)],
);

export const assetDealDetails = pgTable("asset_deal_detail", {
  dealId: uuid("deal_id").primaryKey().references(() => deals.id),
  assetsDescription: text("assets_description").notNull(), // CONFIDENTIAL_DEAL
  includesGoodwill: boolean("includes_goodwill").notNull().default(true),
});

export const shareDealDetails = pgTable("share_deal_detail", {
  dealId: uuid("deal_id").primaryKey().references(() => deals.id),
  legalForm: legalFormEnum("legal_form").notNull(), // INTERNAL
  apeEligible: boolean("ape_eligible").notNull().default(false), // dérivé
  securityType: varchar("security_type", { length: 32 }).notNull(), // CONFIDENTIAL_DEAL : ACTIONS | PARTS_SOCIALES
  stakePercentEnc: text("stake_percent_enc").notNull(), // CONFIDENTIAL_DEAL, T2 uniquement, chiffré
  transferRestrictionsEnc: text("transfer_restrictions_enc"), // CONFIDENTIAL_DEAL : clauses d'agrément, préemption, chiffré
});

export const dealEvents = pgTable(
  "deal_event",
  {
    id: id(),
    dealId: uuid("deal_id").notNull().references(() => deals.id),
    fromStatus: dealStatusEnum("from_status"),
    toStatus: dealStatusEnum("to_status").notNull(),
    actorUserId: uuid("actor_user_id"),
    reason: text("reason"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("deal_event_deal_idx").on(t.dealId, t.occurredAt)],
);

/** Manifestation d'intérêt (P09). Aucune pièce jointe avant NDA. */
export const interests = pgTable("interest", {
  id: id(),
  dealId: uuid("deal_id").notNull().references(() => deals.id),
  investorUserId: uuid("investor_user_id").notNull().references(() => users.id),
  message: text("message"), // INTERNAL
  matchReasons: jsonb("match_reasons").$type<string[]>().notNull().default(sql`'[]'::jsonb`), // justification lisible
  createdAt: createdAt(),
});

export const certifications = pgTable("certification", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  scopeStatement: text("scope_statement").notNull(), // texte du badge : vérifié / non vérifié
  decision: certificationDecisionEnum("decision").notNull(),
  officerUserId: uuid("officer_user_id").notNull(), // décision nominative obligatoire (DP-CCI-006)
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revocationReason: text("revocation_reason"),
  registryInvalidatedAt: timestamp("registry_invalidated_at", { withTimezone: true }), // décision historique conservée, badge non courant
});

export const indicativeValuations = pgTable("indicative_valuation", {
  id: id(),
  dealId: uuid("deal_id").notNull().references(() => deals.id),
  method: varchar("method", { length: 32 }).notNull(),
  equityLowEnc: text("equity_low_enc").notNull(), // CONFIDENTIAL_DEAL, chiffré
  equityHighEnc: text("equity_high_enc").notNull(), // CONFIDENTIAL_DEAL, chiffré
  calculationLog: jsonb("calculation_log").notNull(), // journal de calcul versionné, rejouable
  sources: jsonb("sources").$type<string[]>().notNull(),
  computedBy: uuid("computed_by").notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feeEvents = pgTable("fee_event", {
  id: id(),
  dealId: uuid("deal_id").notNull().references(() => deals.id),
  basisXof: bigint("basis_xof", { mode: "number" }).notNull(),
  tierRatePercent: integer("tier_rate_percent").notNull(),
  minimumApplied: boolean("minimum_applied").notNull().default(false),
  platformShareXof: bigint("platform_share_xof", { mode: "number" }).notNull(),
  institutionShareXof: bigint("institution_share_xof", { mode: "number" }).notNull(),
  status: feeEventStatusEnum("status").notNull(),
  createdAt: createdAt(),
});

/** Journal d'audit append-only : identifiants, action, résultat, corrélation. Jamais de contenu confidentiel. */
export const auditEvents = pgTable(
  "audit_event",
  {
    id: id(),
    action: varchar("action", { length: 64 }).notNull(),
    actorUserId: uuid("actor_user_id"),
    subjectType: varchar("subject_type", { length: 64 }).notNull(),
    subjectId: varchar("subject_id", { length: 64 }).notNull(),
    outcome: varchar("outcome", { length: 16 }).notNull(),
    correlationId: varchar("correlation_id", { length: 128 }).notNull(),
    metadata: jsonb("metadata"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_subject_idx").on(t.subjectType, t.subjectId)],
);

/** Deal-Connect (V1, pont Remo.co) : DealPME est la référence des événements et des inscriptions ; Remo héberge la session live. */
export const events = pgTable("event", {
  id: id(),
  title: varchar("title", { length: 200 }).notNull(), // PUBLIC
  description: text("description"), // PUBLIC
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  capacity: integer("capacity").notNull().default(100),
  integrationMode: varchar("integration_mode", { length: 16 }).notNull().default("DEALPME_FIRST"), // DEALPME_FIRST | REMO_FIRST
  remoEventId: varchar("remo_event_id", { length: 128 }), // INTERNAL
  organiserUserId: uuid("organiser_user_id").notNull(), // officier CCI-Togo ou administrateur
  campaignId: varchar("campaign_id", { length: 64 }), // attribution des inscriptions issues de l'événement
  status: varchar("status", { length: 16 }).notNull().default("DRAFT"), // DRAFT | PUBLISHED | CLOSED
  audience: varchar("audience", { length: 16 }).notNull().default("PUBLIC"),
  branding: jsonb("branding").$type<import("@dealpme/connector-remo").RemoEventRequest["branding"]>().notNull().default(sql`'{"label":"DealPME","accent":"#1C2751","welcome":"Bienvenue"}'::jsonb`),
  revision: integer("revision").notNull().default(1),
  publicationKey: uuid("publication_key"),
  creationHash: varchar("creation_hash", { length: 64 }),
  brandingOrigin: jsonb("branding_origin").$type<{scope:"ACCOUNT"|"EVENT";version:string}>().notNull().default(sql`'{"scope":"EVENT","version":"legacy"}'::jsonb`),
  provider: varchar("provider", { length: 16 }).notNull().default("legacy"),
  providerAccountKey: varchar("provider_account_key", { length: 64 }),
  providerCompanyId: varchar("provider_company_id", { length: 128 }),
  syncError: varchar("sync_error", { length: 64 }),
  syncStartedAt: timestamp("sync_started_at", { withTimezone: true }),
  cancellationReason: varchar("cancellation_reason", { length: 2000 }),
  createdAt: createdAt(),
});

export const eventRegistrations = pgTable(
  "event_registration",
  {
    id: id(),
    eventId: uuid("event_id").notNull().references(() => events.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    displayName: varchar("display_name", { length: 120 }).notNull(), // seule donnée transmise à Remo
    consentContactAt: timestamp("consent_contact_at", { withTimezone: true }), // échange de contacts avec consentement (P20)
    ticketRef: varchar("ticket_ref", { length: 128 }), // référence du paiement mobile money ou du billet Remo
    joinedAt: timestamp("joined_at", { withTimezone: true }), // présence remontée par webhook
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    providerConsentAt: timestamp("provider_consent_at", { withTimezone: true }),
    providerEmail: varchar("provider_email", { length: 254 }),
    invitationState: varchar("invitation_state", { length: 16 }).notNull().default("NONE"),
    providerRole: varchar("provider_role", { length: 16 }).notNull().default("attendee"),
    invitationStartedAt: timestamp("invitation_started_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("registration_unique_idx").on(t.eventId, t.userId), uniqueIndex("registration_provider_email_idx").on(t.eventId, t.providerEmail)],
);

/** Guichet Diaspora (V1 léger) : demande de rendez-vous sécurisé, entretien vidéo via Remo une fois confirmé. */
export const diasporaAppointments = pgTable("diaspora_appointment", {
  id: id(),
  investorUserId: uuid("investor_user_id").notNull().references(() => users.id),
  dealId: uuid("deal_id"), // optionnel : opportunité concernée (T0 uniquement à ce stade)
  requestedSlot: timestamp("requested_slot", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("REQUESTED"), // REQUESTED | CONFIRMED | HELD | CANCELLED
  remoEventId: varchar("remo_event_id", { length: 128 }),
  confirmedBy: uuid("confirmed_by"),
  eventId: uuid("event_id").references(() => events.id),
  decisionReason: varchar("decision_reason", { length: 2000 }),
  providerConsentAt: timestamp("provider_consent_at", { withTimezone: true }),
  crossBorderNoticeShownAt: timestamp("cross_border_notice_shown_at", { withTimezone: true }), // contraintes présentées avant la phase finale (K21.3)
  createdAt: createdAt(),
});

/** Référentiel de réservation commun aux produits utilisant ce compte, pas compteur global chez le fournisseur. */
export const eventProviderAccounts = pgTable("event_provider_account", {
  key: varchar("key", { length: 64 }).primaryKey(),
  provider: varchar("provider", { length: 16 }).notNull(),
  concurrentLimit: integer("concurrent_limit").notNull(),
  marginMinutes: integer("margin_minutes").notNull(),
  qualificationRef: varchar("qualification_ref", { length: 200 }).notNull(),
  externalAccountId: varchar("external_account_id", { length: 128 }),
  branding: jsonb("branding").$type<import("@dealpme/connector-remo").RemoEventRequest["branding"]>(),
  brandRevision: integer("brand_revision").notNull().default(1),
});
export const eventReservations = pgTable("event_reservation", {
  id: id(), accountKey: varchar("account_key", { length: 64 }).notNull().references(() => eventProviderAccounts.key),
  productKey: varchar("product_key", { length: 64 }).notNull(), resourceId: uuid("resource_id").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(), endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  state: varchar("state", { length: 16 }).notNull(), providerRef: varchar("provider_ref", { length: 128 }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("event_reservation_resource_idx").on(t.productKey,t.resourceId), index("event_reservation_account_idx").on(t.accountKey,t.startsAt,t.endsAt)]);

/** Idempotence des POST créateurs d'état et des webhooks (rejeu à l'identique). */
export const idempotencyKeys = pgTable("idempotency_key", {
  key: varchar("key", { length: 256 }).primaryKey(), // méthode:chemin:clé
  requestHash: varchar("request_hash", { length: 64 }), // INTERNAL : nul uniquement pour les anciennes réponses
  responseStatus: integer("response_status").notNull(),
  responseBody: jsonb("response_body").notNull(),
  createdAt: createdAt(),
});

/**
 * Dossier cédant (P04). Deux tables : les pièces déposées et les valeurs déclarées.
 * Les deux sont versionnées et jamais écrasées : une correction crée une version, l'ancienne reste
 * consultable avec sa date et sa source. C'est ce qui rend l'affirmation "déclaré, non audité" vérifiable.
 */
export const documentScanStateEnum = pgEnum("document_scan_state", ["CLEAN", "INFECTED", "ERROR"]);
export const declaredSourceEnum = pgEnum("declared_source", ["SELLER_DECLARATION", "SUPPORTING_DOCUMENT", "REGISTRY", "EXPERT_REVIEW"]);

export const dealDocuments = pgTable(
  "deal_document",
  {
    id: id(),
    dealId: uuid("deal_id").notNull().references(() => deals.id),
    category: varchar("category", { length: 48 }).notNull(), // INTERNAL : rubrique de la liste des pièces attendues
    title: varchar("title", { length: 200 }).notNull(), // INTERNAL
    fileName: varchar("file_name", { length: 260 }).notNull(), // INTERNAL
    contentType: varchar("content_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(), // empreinte du contenu déposé
    storageKey: varchar("storage_key", { length: 512 }).notNull(), // CONFIDENTIAL_DEAL : clé objet, jamais une URL
    storageVersionId: varchar("storage_version_id", { length: 128 }).notNull(),
    version: integer("version").notNull().default(1),
    supersedesId: uuid("supersedes_id"), // version précédente, conservée
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    scanState: documentScanStateEnum("scan_state").notNull(),
    scanEngine: varchar("scan_engine", { length: 48 }).notNull(),
    scanSignature: varchar("scan_signature", { length: 200 }), // renseignée uniquement si une menace a été trouvée
    uploadedBy: uuid("uploaded_by").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("deal_document_deal_idx").on(t.dealId, t.category)],
);

/** Valeur déclarée par le cédant, avec sa source, sa date et sa version (DP-MKT : provenance obligatoire). */
export const declaredFacts = pgTable(
  "declared_fact",
  {
    id: id(),
    dealId: uuid("deal_id").notNull().references(() => deals.id),
    fieldKey: varchar("field_key", { length: 64 }).notNull(), // INTERNAL : clé du référentiel de champs
    periodLabel: varchar("period_label", { length: 16 }), // exercice concerné, par exemple 2025
    valueText: text("value_text"), // INTERNAL : valeur non financière
    valueAmountXof: bigint("value_amount_xof", { mode: "number" }), // INTERNAL : montant entier en XOF, jamais de décimale
    source: declaredSourceEnum("source").notNull(),
    sourceDocumentId: uuid("source_document_id"), // pièce justificative, quand elle existe
    note: text("note"), // retraitement et sa justification
    version: integer("version").notNull().default(1),
    supersedesId: uuid("supersedes_id"),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    declaredBy: uuid("declared_by").notNull(),
    declaredAt: timestamp("declared_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("declared_fact_deal_idx").on(t.dealId, t.fieldKey)],
);

/**
 * Demande de certification Deal-Ready (P06). L'entreprise dépose une demande, l'officier CCI-Togo
 * l'instruit : il peut demander une remédiation nommée, puis décider. La décision elle-même reste dans
 * certification, nominative et jamais automatique ; cette table ne porte que l'instruction.
 */
export const certificationRequestStateEnum = pgEnum("certification_request_state", ["REQUESTED", "REMEDIATION_REQUIRED", "DECIDED", "WITHDRAWN"]);

export const certificationRequests = pgTable(
  "certification_request",
  {
    id: id(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    state: certificationRequestStateEnum("state").notNull().default("REQUESTED"),
    message: text("message"), // INTERNAL : mot du cédant à l'appui de sa demande
    remediationItems: jsonb("remediation_items").$type<{ label: string; detail: string | null }[]>().notNull().default(sql`'[]'::jsonb`),
    remediationSetBy: uuid("remediation_set_by"),
    remediationSetAt: timestamp("remediation_set_at", { withTimezone: true }),
    certificationId: uuid("certification_id"), // décision qui a clos la demande
    requestedBy: uuid("requested_by").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [index("certification_request_company_idx").on(t.companyId, t.state)],
);

/**
 * Place de marché (P09). Trois tables complètent la mise en relation :
 * les consultations (pour un compteur honnête côté cédant), les messages (sans pièce jointe avant NDA)
 * et les alertes enregistrées (jamais sans consentement explicite).
 */
export const dealViews = pgTable(
  "deal_view",
  {
    id: id(),
    dealId: uuid("deal_id").notNull().references(() => deals.id),
    viewerUserId: uuid("viewer_user_id"), // nul pour un visiteur non connecté
    viewerOrganisationId: uuid("viewer_organisation_id"), // INTERNAL : jamais montré au cédant, sert au comptage distinct
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("deal_view_deal_idx").on(t.dealId, t.viewedAt)],
);

/** Un seul fil par dossier et organisation repreneuse, parties immuables. */
export const dealConversations = pgTable("deal_conversation", {
  id: id(),
  dealId: uuid("deal_id").notNull().references(() => deals.id),
  sellerOrganisationId: uuid("seller_organisation_id").notNull().references(() => organisations.id), // INTERNAL
  investorOrganisationId: uuid("investor_organisation_id").notNull().references(() => organisations.id), // INTERNAL, jamais sérialisé en T0
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("conversation_deal_investor_idx").on(t.dealId, t.investorOrganisationId),
  uniqueIndex("conversation_id_deal_idx").on(t.id, t.dealId),
  check("conversation_distinct_parties", sql`${t.sellerOrganisationId} <> ${t.investorOrganisationId}`),
]);

/** Messagerie : conversation obligatoire à l'insertion ; nul seulement pour l'historique ambigu conservé. */
export const dealMessages = pgTable(
  "deal_message",
  {
    id: id(),
    dealId: uuid("deal_id").notNull().references(() => deals.id),
    interestId: uuid("interest_id").references(() => interests.id),
    conversationId: uuid("conversation_id"), // INTERNAL : routage, jamais une identité de repreneur
    senderUserId: uuid("sender_user_id").notNull(),
    senderOrganisationId: uuid("sender_organisation_id").notNull(),
    body: text("body").notNull(), // INTERNAL : contenu filtré côté serveur, jamais de coordonnées avant NDA
    createdAt: createdAt(),
  },
  (t) => [
    index("deal_message_deal_idx").on(t.dealId, t.createdAt),
    index("deal_message_conversation_idx").on(t.conversationId, t.createdAt, t.id),
    foreignKey({ name: "message_conversation_deal_fk", columns: [t.conversationId, t.dealId], foreignColumns: [dealConversations.id, dealConversations.dealId] }),
  ],
);

/** Alerte enregistrée : critères T0 uniquement, envoi conditionné à un consentement explicite et révocable. */
export const savedAlerts = pgTable(
  "saved_alert",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id),
    organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
    label: varchar("label", { length: 120 }).notNull(),
    sectorCode: varchar("sector_code", { length: 16 }),
    regionCode: regionEnum("region_code"),
    turnoverBand: turnoverBandEnum("turnover_band"),
    dealReadyOnly: boolean("deal_ready_only").notNull().default(false),
    notifyOptIn: boolean("notify_opt_in").notNull().default(false), // jamais vrai par défaut
    optInAt: timestamp("opt_in_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("saved_alert_user_idx").on(t.userId)],
);

/** Outbox durable : une intention par alerte/opportunité, contenu limité à la projection T0. */
export const notificationIntents = pgTable("notification_intent", {
  id: id(),
  alertId: uuid("alert_id").notNull().references(() => savedAlerts.id),
  dealId: uuid("deal_id").notNull().references(() => deals.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  organisationId: uuid("organisation_id").notNull(),
  score: integer("score").notNull(),
  reasons: jsonb("reasons").$type<string[]>().notNull(),
  state: varchar("state", { length: 16 }).notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  providerRef: varchar("provider_ref", { length: 256 }),
  lastError: varchar("last_error", { length: 64 }),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("notification_intent_dedupe_idx").on(t.alertId, t.dealId), index("notification_intent_pending_idx").on(t.state, t.nextAttemptAt)]);
