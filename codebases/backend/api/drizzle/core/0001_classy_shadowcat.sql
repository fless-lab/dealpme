CREATE TYPE "public"."declared_source" AS ENUM('SELLER_DECLARATION', 'SUPPORTING_DOCUMENT', 'REGISTRY', 'EXPERT_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."document_scan_state" AS ENUM('CLEAN', 'INFECTED', 'ERROR');--> statement-breakpoint
CREATE TABLE "deal_document" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deal_id" uuid NOT NULL,
	"category" varchar(48) NOT NULL,
	"title" varchar(200) NOT NULL,
	"file_name" varchar(260) NOT NULL,
	"content_type" varchar(120) NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"storage_version_id" varchar(128) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"supersedes_id" uuid,
	"superseded_at" timestamp with time zone,
	"scan_state" "document_scan_state" NOT NULL,
	"scan_engine" varchar(48) NOT NULL,
	"scan_signature" varchar(200),
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "declared_fact" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deal_id" uuid NOT NULL,
	"field_key" varchar(64) NOT NULL,
	"period_label" varchar(16),
	"value_text" text,
	"value_amount_xof" bigint,
	"source" "declared_source" NOT NULL,
	"source_document_id" uuid,
	"note" text,
	"version" integer DEFAULT 1 NOT NULL,
	"supersedes_id" uuid,
	"superseded_at" timestamp with time zone,
	"declared_by" uuid NOT NULL,
	"declared_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deal_document" ADD CONSTRAINT "deal_document_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declared_fact" ADD CONSTRAINT "declared_fact_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_document_deal_idx" ON "deal_document" USING btree ("deal_id","category");--> statement-breakpoint
CREATE INDEX "declared_fact_deal_idx" ON "declared_fact" USING btree ("deal_id","field_key");