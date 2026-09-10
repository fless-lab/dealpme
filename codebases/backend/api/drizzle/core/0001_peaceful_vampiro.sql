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
ALTER TABLE "diaspora_appointment" ADD CONSTRAINT "diaspora_appointment_investor_user_id_app_user_id_fk" FOREIGN KEY ("investor_user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "registration_unique_idx" ON "event_registration" USING btree ("event_id","user_id");