ALTER TABLE "diaspora_appointment" ADD COLUMN "provider_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_provider_account" ADD COLUMN "external_account_id" varchar(128);--> statement-breakpoint
ALTER TABLE "event_provider_account" ADD COLUMN "branding" jsonb;--> statement-breakpoint
ALTER TABLE "event_provider_account" ADD COLUMN "brand_revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_registration" ADD COLUMN "provider_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_registration" ADD COLUMN "provider_email" varchar(254);--> statement-breakpoint
ALTER TABLE "event_registration" ADD COLUMN "invitation_state" varchar(16) DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_registration" ADD COLUMN "invitation_started_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "registration_provider_email_idx" ON "event_registration" USING btree ("event_id","provider_email");