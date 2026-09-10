import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar, bigint, index, uniqueIndex } from "drizzle-orm/pg-core";

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
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("registration_unique_idx").on(t.eventId, t.userId)],
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
  crossBorderNoticeShownAt: timestamp("cross_border_notice_shown_at", { withTimezone: true }), // contraintes présentées avant la phase finale (K21.3)
  createdAt: createdAt(),
});

/** Idempotence des POST créateurs d'état et des webhooks (rejeu à l'identique). */
export const idempotencyKeys = pgTable("idempotency_key", {
  key: varchar("key", { length: 256 }).primaryKey(), // méthode:chemin:clé
  responseStatus: integer("response_status").notNull(),
  responseBody: jsonb("response_body").notNull(),
  createdAt: createdAt(),
});
