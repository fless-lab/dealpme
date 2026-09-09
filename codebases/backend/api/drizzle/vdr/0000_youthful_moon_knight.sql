CREATE TYPE "public"."document_status" AS ENUM('UPLOADED', 'SCANNING', 'PROCESSING', 'REVIEW_REQUIRED', 'PUBLISHED', 'SUPERSEDED', 'REVOKED', 'QUARANTINED');--> statement-breakpoint
CREATE TYPE "public"."signature_method" AS ENUM('QUALIFIED_ELECTRONIC', 'WET_INK_COUNTERSIGNED');--> statement-breakpoint
CREATE TABLE "access_grant" (
	"id" uuid PRIMARY KEY NOT NULL,
	"data_room_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"folder_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"clean_team" boolean DEFAULT false NOT NULL,
	"download_allowed" boolean DEFAULT false NOT NULL,
	"ai_allowed" boolean DEFAULT false NOT NULL,
	"justification" text NOT NULL,
	"granted_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_room" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deal_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "document_view" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"page" integer NOT NULL,
	"ip_hash" varchar(128),
	"client_label" varchar(120),
	"duration_ms" integer,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY NOT NULL,
	"data_room_id" uuid NOT NULL,
	"folder_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"type" varchar(32) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "document_status" DEFAULT 'UPLOADED' NOT NULL,
	"tier" varchar(2) DEFAULT 'T2' NOT NULL,
	"clean_team" boolean DEFAULT false NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"page_count" integer,
	"download_allowed" boolean DEFAULT false NOT NULL,
	"classification" varchar(32) DEFAULT 'CONFIDENTIAL_DEAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folder" (
	"id" uuid PRIMARY KEY NOT NULL,
	"data_room_id" uuid NOT NULL,
	"parent_id" uuid,
	"code" varchar(32) NOT NULL,
	"title" varchar(160) NOT NULL,
	"clean_team" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nda_instance" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deal_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"template_version" varchar(32) NOT NULL,
	"document_sha256" varchar(64) NOT NULL,
	"executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qa_thread" (
	"id" uuid PRIMARY KEY NOT NULL,
	"data_room_id" uuid NOT NULL,
	"document_id" uuid,
	"category" varchar(32) NOT NULL,
	"author_person_id" uuid NOT NULL,
	"visibility" varchar(16) DEFAULT 'PRIVATE' NOT NULL,
	"status" varchar(16) DEFAULT 'OPEN' NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"answered_by" uuid,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signature_evidence" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nda_instance_id" uuid NOT NULL,
	"method" "signature_method" NOT NULL,
	"provider_ref" varchar(200),
	"certificate_chain" text,
	"timestamp_token" text,
	"document_sha256" varchar(64) NOT NULL,
	"archive_ref" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_grant" ADD CONSTRAINT "access_grant_data_room_id_data_room_id_fk" FOREIGN KEY ("data_room_id") REFERENCES "public"."data_room"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_view" ADD CONSTRAINT "document_view_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_data_room_id_data_room_id_fk" FOREIGN KEY ("data_room_id") REFERENCES "public"."data_room"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_folder_id_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folder"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_data_room_id_data_room_id_fk" FOREIGN KEY ("data_room_id") REFERENCES "public"."data_room"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_thread" ADD CONSTRAINT "qa_thread_data_room_id_data_room_id_fk" FOREIGN KEY ("data_room_id") REFERENCES "public"."data_room"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_evidence" ADD CONSTRAINT "signature_evidence_nda_instance_id_nda_instance_id_fk" FOREIGN KEY ("nda_instance_id") REFERENCES "public"."nda_instance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grant_person_idx" ON "access_grant" USING btree ("person_id","data_room_id");--> statement-breakpoint
CREATE INDEX "view_document_idx" ON "document_view" USING btree ("document_id","viewed_at");--> statement-breakpoint
CREATE INDEX "document_room_idx" ON "document" USING btree ("data_room_id","folder_id");