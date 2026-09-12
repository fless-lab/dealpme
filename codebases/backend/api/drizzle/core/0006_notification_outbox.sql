CREATE TABLE "notification_intent" (
	"id" uuid PRIMARY KEY NOT NULL,
	"alert_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"reasons" jsonb NOT NULL,
	"state" varchar(16) DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"provider_ref" varchar(256),
	"last_error" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_intent" ADD CONSTRAINT "notification_intent_alert_id_saved_alert_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."saved_alert"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_intent" ADD CONSTRAINT "notification_intent_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_intent" ADD CONSTRAINT "notification_intent_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_intent_dedupe_idx" ON "notification_intent" USING btree ("alert_id","deal_id");--> statement-breakpoint
CREATE INDEX "notification_intent_pending_idx" ON "notification_intent" USING btree ("state","next_attempt_at");
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dealpme_worker') THEN
    CREATE ROLE dealpme_worker NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO dealpme_worker;
GRANT SELECT ON saved_alert TO dealpme_worker;
GRANT SELECT (id,organisation_id,email,email_verified_at,roles) ON app_user TO dealpme_worker;
GRANT SELECT (id,organisation_id,payment_state,period_end,created_at) ON subscription TO dealpme_worker;
GRANT SELECT (id,company_id,seller_organisation_id,deal_type,status,visibility,sector_code,region_code,turnover_band) ON deal TO dealpme_worker;
GRANT SELECT (id,registry_record_id) ON company TO dealpme_worker;
GRANT SELECT (id,company_id,decision,expires_at,decided_at) ON certification TO dealpme_worker;
-- SELECT FOR SHARE/UPDATE exige un droit UPDATE ; seule la colonne identifiant est accordée.
GRANT UPDATE (id) ON saved_alert,app_user,subscription,deal TO dealpme_worker;
GRANT SELECT,INSERT,UPDATE ON notification_intent TO dealpme_worker;
GRANT INSERT ON audit_event TO dealpme_worker;
CREATE POLICY saved_alert_worker ON saved_alert TO dealpme_worker USING (true) WITH CHECK (false);
CREATE POLICY company_worker_read ON company FOR SELECT TO dealpme_worker USING (true);
CREATE POLICY deal_worker_lock ON deal FOR UPDATE TO dealpme_worker USING (visibility='OPEN' AND deal_type='ASSET_DEAL') WITH CHECK (false);
ALTER TABLE notification_intent ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_intent FORCE ROW LEVEL SECURITY;
CREATE POLICY notification_worker ON notification_intent TO dealpme_worker USING (true) WITH CHECK (true);
CREATE POLICY notification_self ON notification_intent FOR SELECT TO dealpme_api USING (user_id::text=current_setting('app.user_id',true));
ALTER TABLE notification_intent ADD CONSTRAINT notification_intent_state CHECK (state IN ('PENDING','SENDING','SENT','RETRY','CANCELLED','FAILED','UNKNOWN'));
ALTER TABLE notification_intent ADD CONSTRAINT notification_intent_attempts CHECK (attempts BETWEEN 0 AND 3);
