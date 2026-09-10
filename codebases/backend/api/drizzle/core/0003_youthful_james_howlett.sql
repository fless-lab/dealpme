CREATE TABLE "deal_message" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deal_id" uuid NOT NULL,
	"interest_id" uuid,
	"sender_user_id" uuid NOT NULL,
	"sender_organisation_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_view" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deal_id" uuid NOT NULL,
	"viewer_user_id" uuid,
	"viewer_organisation_id" uuid,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_alert" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"label" varchar(120) NOT NULL,
	"sector_code" varchar(16),
	"region_code" "region_code",
	"turnover_band" "turnover_band",
	"deal_ready_only" boolean DEFAULT false NOT NULL,
	"notify_opt_in" boolean DEFAULT false NOT NULL,
	"opt_in_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deal_message" ADD CONSTRAINT "deal_message_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_message" ADD CONSTRAINT "deal_message_interest_id_interest_id_fk" FOREIGN KEY ("interest_id") REFERENCES "public"."interest"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_view" ADD CONSTRAINT "deal_view_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_alert" ADD CONSTRAINT "saved_alert_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_alert" ADD CONSTRAINT "saved_alert_organisation_id_organisation_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_message_deal_idx" ON "deal_message" USING btree ("deal_id","created_at");--> statement-breakpoint
CREATE INDEX "deal_view_deal_idx" ON "deal_view" USING btree ("deal_id","viewed_at");--> statement-breakpoint
CREATE INDEX "saved_alert_user_idx" ON "saved_alert" USING btree ("user_id");