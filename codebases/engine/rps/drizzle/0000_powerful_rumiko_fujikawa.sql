CREATE TYPE "public"."admission_decision_kind" AS ENUM('ADMITTED', 'REFUSED', 'WAITLISTED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."disclosure_tier" AS ENUM('T0', 'T1', 'T2');--> statement-breakpoint
CREATE TABLE "admission_decision" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deal_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"decision" "admission_decision_kind" NOT NULL,
	"decided_by" uuid NOT NULL,
	"justification" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle" (
	"deal_id" uuid PRIMARY KEY NOT NULL,
	"deal_type" varchar(16) NOT NULL,
	"legal_form" varchar(16),
	"cap" integer DEFAULT 50 NOT NULL,
	"manual_admission_only" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disclosure" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deal_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"tier" "disclosure_tier" NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" uuid,
	"basis" text NOT NULL,
	"related_person_group_id" uuid,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "regulatory_log_entry" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sequence" integer NOT NULL,
	"deal_id" uuid,
	"action" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"previous_hash" varchar(64) NOT NULL,
	"hash" varchar(64) NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "related_person_group" (
	"id" uuid PRIMARY KEY NOT NULL,
	"label" varchar(160) NOT NULL,
	"person_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "disclosure_deal_idx" ON "disclosure" USING btree ("deal_id","person_id");--> statement-breakpoint
CREATE INDEX "reglog_seq_idx" ON "regulatory_log_entry" USING btree ("sequence");