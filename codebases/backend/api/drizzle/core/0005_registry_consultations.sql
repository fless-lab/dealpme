CREATE TABLE "registry_consultation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"officer_user_id" uuid NOT NULL,
	"rccm_number" varchar(64) NOT NULL,
	"declared_identity" jsonb NOT NULL,
	"mode" varchar(16) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"synthetic" boolean NOT NULL,
	"outcome" varchar(32) NOT NULL,
	"result" jsonb,
	"reason" varchar(2000),
	"fallback_from_id" uuid,
	"registry_record_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registry_consultation" ADD CONSTRAINT "registry_consultation_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "registry_consultation_request_idx" ON "registry_consultation" USING btree ("company_id","request_id");--> statement-breakpoint
CREATE INDEX "registry_consultation_company_idx" ON "registry_consultation" USING btree ("company_id","created_at");
--> statement-breakpoint
ALTER TABLE registry_consultation ENABLE ROW LEVEL SECURITY;
ALTER TABLE registry_consultation FORCE ROW LEVEL SECURITY;
CREATE POLICY registry_consultation_read ON registry_consultation FOR SELECT USING (
  EXISTS (SELECT 1 FROM company WHERE company.id = registry_consultation.company_id)
);
CREATE POLICY registry_consultation_insert ON registry_consultation FOR INSERT WITH CHECK (
  position('CCI_OFFICER' in coalesce(current_setting('app.roles', true), '')) > 0
  AND officer_user_id::text = current_setting('app.user_id', true)
  AND EXISTS (SELECT 1 FROM company c WHERE c.id = company_id AND c.owner_organisation_id::text <> current_setting('app.organisation_id', true))
);
GRANT SELECT, INSERT ON registry_consultation TO dealpme_api;
--> statement-breakpoint
CREATE FUNCTION registry_consultation_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Les consultations de registre sont append-only';
END;
$$;
CREATE TRIGGER registry_consultation_immutable BEFORE UPDATE OR DELETE ON registry_consultation
FOR EACH ROW EXECUTE FUNCTION registry_consultation_immutable();
--> statement-breakpoint
CREATE FUNCTION company_registry_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.legal_name, NEW.legal_form, NEW.rccm_number) IS DISTINCT FROM (OLD.legal_name, OLD.legal_form, OLD.rccm_number) THEN
    NEW.registry_record_id := NULL;
  ELSIF NEW.registry_record_id IS DISTINCT FROM OLD.registry_record_id AND current_user = 'dealpme_api'
    AND position('CCI_OFFICER' in coalesce(current_setting('app.roles', true), '')) = 0 THEN
    RAISE EXCEPTION 'La référence registre est réservée à l''instruction CCI';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER company_registry_identity_guard BEFORE UPDATE ON company
FOR EACH ROW EXECUTE FUNCTION company_registry_identity_guard();
