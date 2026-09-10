CREATE TYPE "public"."certification_request_state" AS ENUM('REQUESTED', 'REMEDIATION_REQUIRED', 'DECIDED', 'WITHDRAWN');--> statement-breakpoint
CREATE TABLE "certification_request" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"state" "certification_request_state" DEFAULT 'REQUESTED' NOT NULL,
	"message" text,
	"remediation_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"remediation_set_by" uuid,
	"remediation_set_at" timestamp with time zone,
	"certification_id" uuid,
	"requested_by" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "certification_request" ADD CONSTRAINT "certification_request_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certification_request_company_idx" ON "certification_request" USING btree ("company_id","state");