CREATE TABLE "event_provider_account" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"provider" varchar(16) NOT NULL,
	"concurrent_limit" integer NOT NULL,
	"margin_minutes" integer NOT NULL,
	"qualification_ref" varchar(200) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_reservation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_key" varchar(64) NOT NULL,
	"product_key" varchar(64) NOT NULL,
	"resource_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"state" varchar(16) NOT NULL,
	"provider_ref" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diaspora_appointment" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "diaspora_appointment" ADD COLUMN "decision_reason" varchar(2000);--> statement-breakpoint
ALTER TABLE "event_registration" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "audience" varchar(16) DEFAULT 'PUBLIC' NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "branding" jsonb DEFAULT '{"label":"DealPME","accent":"#1C2751","welcome":"Bienvenue"}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "publication_key" uuid;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "provider" varchar(16) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "sync_error" varchar(64);--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "sync_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "cancellation_reason" varchar(2000);--> statement-breakpoint
ALTER TABLE "event_reservation" ADD CONSTRAINT "event_reservation_account_key_event_provider_account_key_fk" FOREIGN KEY ("account_key") REFERENCES "public"."event_provider_account"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_reservation_resource_idx" ON "event_reservation" USING btree ("product_key","resource_id");--> statement-breakpoint
CREATE INDEX "event_reservation_account_idx" ON "event_reservation" USING btree ("account_key","starts_at","ends_at");--> statement-breakpoint
ALTER TABLE "diaspora_appointment" ADD CONSTRAINT "diaspora_appointment_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE event ENABLE ROW LEVEL SECURITY;
ALTER TABLE event FORCE ROW LEVEL SECURITY;
CREATE POLICY event_public ON event FOR SELECT USING (audience='PUBLIC' AND status='PUBLISHED');
CREATE POLICY event_owner ON event USING (organiser_user_id::text=current_setting('app.user_id',true))
  WITH CHECK (organiser_user_id::text=current_setting('app.user_id',true) AND (position('CCI_OFFICER' in current_setting('app.roles',true))>0 OR position('PLATFORM_ADMIN' in current_setting('app.roles',true))>0));
CREATE POLICY event_diaspora_read ON event FOR SELECT USING (EXISTS (SELECT 1 FROM diaspora_appointment a WHERE a.event_id=event.id AND a.investor_user_id::text=current_setting('app.user_id',true)));
CREATE POLICY event_webhook_read ON event FOR SELECT USING (current_setting('app.service',true)='event-webhook');
ALTER TABLE event_registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registration FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS registration_self ON event_registration;
DROP POLICY IF EXISTS registration_officer ON event_registration;
CREATE POLICY registration_self ON event_registration USING (user_id::text=current_setting('app.user_id',true)) WITH CHECK (user_id::text=current_setting('app.user_id',true));
CREATE POLICY registration_owner ON event_registration USING (EXISTS (SELECT 1 FROM event e WHERE e.id=event_id AND e.organiser_user_id::text=current_setting('app.user_id',true))) WITH CHECK (EXISTS (SELECT 1 FROM event e WHERE e.id=event_id AND e.organiser_user_id::text=current_setting('app.user_id',true)));
CREATE POLICY registration_webhook ON event_registration USING (current_setting('app.service',true)='event-webhook') WITH CHECK (current_setting('app.service',true)='event-webhook');
ALTER TABLE diaspora_appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaspora_appointment FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS appointment_self ON diaspora_appointment;
DROP POLICY IF EXISTS appointment_officer ON diaspora_appointment;
CREATE POLICY appointment_self ON diaspora_appointment USING (investor_user_id::text=current_setting('app.user_id',true)) WITH CHECK (investor_user_id::text=current_setting('app.user_id',true));
CREATE POLICY appointment_officer ON diaspora_appointment USING (position('CCI_OFFICER' in coalesce(current_setting('app.roles',true),''))>0 OR position('PLATFORM_ADMIN' in coalesce(current_setting('app.roles',true),''))>0);
ALTER TABLE event_provider_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_provider_account FORCE ROW LEVEL SECURITY;
CREATE POLICY event_account_officer ON event_provider_account USING (position('CCI_OFFICER' in coalesce(current_setting('app.roles',true),''))>0 OR position('PLATFORM_ADMIN' in coalesce(current_setting('app.roles',true),''))>0);
ALTER TABLE event_reservation ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reservation FORCE ROW LEVEL SECURITY;
CREATE POLICY event_reservation_officer ON event_reservation USING (position('CCI_OFFICER' in coalesce(current_setting('app.roles',true),''))>0 OR position('PLATFORM_ADMIN' in coalesce(current_setting('app.roles',true),''))>0);
ALTER TABLE event_reservation ADD CONSTRAINT event_reservation_interval CHECK (ends_at>starts_at);
ALTER TABLE event_provider_account ADD CONSTRAINT event_account_limits CHECK (concurrent_limit>0 AND margin_minutes>=0);
GRANT SELECT,INSERT,UPDATE ON event_provider_account,event_reservation TO dealpme_api;
--> statement-breakpoint
CREATE FUNCTION event_registration_counts() RETURNS TABLE(event_id uuid,n bigint)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT e.id,count(r.id) FROM public.event e LEFT JOIN public.event_registration r ON r.event_id=e.id AND r.cancelled_at IS NULL
  WHERE (e.audience='PUBLIC' AND e.status='PUBLISHED') OR e.organiser_user_id::text=current_setting('app.user_id',true)
  GROUP BY e.id;
$$;
REVOKE ALL ON FUNCTION event_registration_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION event_registration_counts() TO dealpme_api;
--> statement-breakpoint
CREATE FUNCTION event_registration_capacity_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.event; taken bigint;
BEGIN
  SELECT * INTO e FROM public.event WHERE id=NEW.event_id FOR UPDATE;
  IF NEW.cancelled_at IS NULL THEN
    IF e.status<>'PUBLISHED' OR e.ends_at<=now() THEN RAISE EXCEPTION 'event_not_open' USING ERRCODE='check_violation'; END IF;
    IF e.audience='DIASPORA' AND NOT EXISTS(SELECT 1 FROM public.diaspora_appointment a WHERE a.event_id=e.id AND a.investor_user_id=NEW.user_id AND a.status IN ('CONFIRMING','CONFIRMED')) THEN RAISE EXCEPTION 'private_event' USING ERRCODE='check_violation'; END IF;
    SELECT count(*) INTO taken FROM public.event_registration WHERE event_id=NEW.event_id AND cancelled_at IS NULL AND id<>NEW.id;
    IF taken>=e.capacity THEN RAISE EXCEPTION 'event_full' USING ERRCODE='check_violation'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER event_registration_capacity_guard BEFORE INSERT OR UPDATE OF cancelled_at ON event_registration FOR EACH ROW EXECUTE FUNCTION event_registration_capacity_guard();
