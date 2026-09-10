CREATE TYPE "public"."certification_decision" AS ENUM('GRANTED', 'REFUSED', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."deal_status" AS ENUM('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'LISTED_OPEN', 'LISTED_RESTRICTED', 'ENGAGED', 'DUE_DILIGENCE', 'NEGOTIATION', 'CLOSED_REPORTED', 'HANDED_OFF', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "public"."deal_type" AS ENUM('ASSET_DEAL', 'SHARE_DEAL');--> statement-breakpoint
CREATE TYPE "public"."deal_visibility" AS ENUM('DRAFT', 'OPEN', 'RESTRICTED_CIRCLE', 'INVITE_ONLY', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."fee_event_status" AS ENUM('PENDING', 'SUSPENDED', 'SETTLED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."legal_form" AS ENUM('SA', 'SARL', 'SAS', 'SNC', 'SCS', 'GIE', 'SOCIETE_CIVILE', 'AUTRE');--> statement-breakpoint
CREATE TYPE "public"."payment_state" AS ENUM('PAID', 'GRACE_READ_ONLY', 'GRACE_TEASER_ONLY', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."region_code" AS ENUM('GRAND_LOME', 'MARITIME', 'PLATEAUX', 'CENTRALE', 'KARA', 'SAVANES');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('STARTER', 'BUSINESS', 'PREMIUM', 'ELITE');--> statement-breakpoint
CREATE TYPE "public"."turnover_band" AS ENUM('LT_50M', 'FROM_50M_TO_250M', 'FROM_250M_TO_1B', 'GT_1B');--> statement-breakpoint
CREATE TABLE "asset_deal_detail" (
	"deal_id" uuid PRIMARY KEY NOT NULL,
	"assets_description" text NOT NULL,
	"includes_goodwill" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"action" varchar(64) NOT NULL,
	"actor_user_id" uuid,
	"subject_type" varchar(64) NOT NULL,
	"subject_id" varchar(64) NOT NULL,
	"outcome" varchar(16) NOT NULL,
	"correlation_id" varchar(128) NOT NULL,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"scope_statement" text NOT NULL,
	"decision" "certification_decision" NOT NULL,
	"officer_user_id" uuid NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revocation_reason" text
);
--> statement-breakpoint
CREATE TABLE "company" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_organisation_id" uuid NOT NULL,
	"legal_name" varchar(200) NOT NULL,
	"legal_form" "legal_form" NOT NULL,
	"rccm_number" varchar(64),
	"registry_record_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deal_id" uuid NOT NULL,
	"from_status" "deal_status",
	"to_status" "deal_status" NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"seller_organisation_id" uuid NOT NULL,
	"deal_type" "deal_type" NOT NULL,
	"status" "deal_status" DEFAULT 'DRAFT' NOT NULL,
	"visibility" "deal_visibility" DEFAULT 'DRAFT' NOT NULL,
	"sector_code" varchar(16) NOT NULL,
	"region_code" "region_code" NOT NULL,
	"turnover_band" "turnover_band" NOT NULL,
	"asking_price_enc" text,
	"valuation_basis_enc" text,
	"disclosure_count" integer DEFAULT 0 NOT NULL,
	"circle_cap" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diaspora_appointment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"investor_user_id" uuid NOT NULL,
	"deal_id" uuid,
	"requested_slot" timestamp with time zone NOT NULL,
	"status" varchar(16) DEFAULT 'REQUESTED' NOT NULL,
	"remo_event_id" varchar(128),
	"confirmed_by" uuid,
	"cross_border_notice_shown_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_registration" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"consent_contact_at" timestamp with time zone,
	"ticket_ref" varchar(128),
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"capacity" integer DEFAULT 100 NOT NULL,
	"integration_mode" varchar(16) DEFAULT 'DEALPME_FIRST' NOT NULL,
	"remo_event_id" varchar(128),
	"organiser_user_id" uuid NOT NULL,
	"campaign_id" varchar(64),
	"status" varchar(16) DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deal_id" uuid NOT NULL,
	"basis_xof" bigint NOT NULL,
	"tier_rate_percent" integer NOT NULL,
	"minimum_applied" boolean DEFAULT false NOT NULL,
	"platform_share_xof" bigint NOT NULL,
	"institution_share_xof" bigint NOT NULL,
	"status" "fee_event_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_key" (
	"key" varchar(256) PRIMARY KEY NOT NULL,
	"response_status" integer NOT NULL,
	"response_body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicative_valuation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deal_id" uuid NOT NULL,
	"method" varchar(32) NOT NULL,
	"equity_low_enc" text NOT NULL,
	"equity_high_enc" text NOT NULL,
	"calculation_log" jsonb NOT NULL,
	"sources" jsonb NOT NULL,
	"computed_by" uuid NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interest" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deal_id" uuid NOT NULL,
	"investor_user_id" uuid NOT NULL,
	"message" text,
	"match_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_confirmation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"confirmation_ref" varchar(64) NOT NULL,
	"confirmed_by" uuid NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"attribution_channel" varchar(64) NOT NULL,
	"attribution_campaign_id" varchar(64),
	"attribution_referral_code" varchar(64),
	"cci_member_confirmation_ref" varchar(64),
	"attribution_captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_challenge" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" varchar(32) NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" uuid PRIMARY KEY NOT NULL,
	"legal_name" varchar(200) NOT NULL,
	"related_person_group_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registry_record" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"rccm_number" varchar(64) NOT NULL,
	"legal_name" varchar(200) NOT NULL,
	"legal_form" "legal_form" NOT NULL,
	"registration_date" timestamp with time zone,
	"status" varchar(64) NOT NULL,
	"registered_address" text,
	"officers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"verified_by" uuid NOT NULL,
	"source_ref" varchar(200) NOT NULL,
	"mode" varchar(16) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"device_label" varchar(120),
	"ip_hash" varchar(128),
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_deal_detail" (
	"deal_id" uuid PRIMARY KEY NOT NULL,
	"legal_form" "legal_form" NOT NULL,
	"ape_eligible" boolean DEFAULT false NOT NULL,
	"security_type" varchar(32) NOT NULL,
	"stake_percent_enc" text NOT NULL,
	"transfer_restrictions_enc" text
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"tier" "subscription_tier" NOT NULL,
	"entitlements_version" varchar(32) NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"payment_state" "payment_state" DEFAULT 'PAID' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"email" varchar(254) NOT NULL,
	"email_verified_at" timestamp with time zone,
	"phone_e164" varchar(20),
	"phone_verified_at" timestamp with time zone,
	"password_hash" text NOT NULL,
	"roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"consent_terms_at" timestamp with time zone NOT NULL,
	"consent_privacy_at" timestamp with time zone NOT NULL,
	"consent_marketing_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_deal_detail" ADD CONSTRAINT "asset_deal_detail_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certification" ADD CONSTRAINT "certification_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_owner_organisation_id_organisation_id_fk" FOREIGN KEY ("owner_organisation_id") REFERENCES "public"."organisation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_event" ADD CONSTRAINT "deal_event_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal" ADD CONSTRAINT "deal_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal" ADD CONSTRAINT "deal_seller_organisation_id_organisation_id_fk" FOREIGN KEY ("seller_organisation_id") REFERENCES "public"."organisation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diaspora_appointment" ADD CONSTRAINT "diaspora_appointment_investor_user_id_app_user_id_fk" FOREIGN KEY ("investor_user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_event" ADD CONSTRAINT "fee_event_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicative_valuation" ADD CONSTRAINT "indicative_valuation_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest" ADD CONSTRAINT "interest_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interest" ADD CONSTRAINT "interest_investor_user_id_app_user_id_fk" FOREIGN KEY ("investor_user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_confirmation" ADD CONSTRAINT "membership_confirmation_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_challenge" ADD CONSTRAINT "otp_challenge_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registry_record" ADD CONSTRAINT "registry_record_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_deal_detail" ADD CONSTRAINT "share_deal_detail_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_subject_idx" ON "audit_event" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "deal_event_deal_idx" ON "deal_event" USING btree ("deal_id","occurred_at");--> statement-breakpoint
CREATE INDEX "deal_search_idx" ON "deal" USING btree ("status","sector_code","region_code","turnover_band");--> statement-breakpoint
CREATE UNIQUE INDEX "registration_unique_idx" ON "event_registration" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_idx" ON "session" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "app_user_email_idx" ON "app_user" USING btree ("email");