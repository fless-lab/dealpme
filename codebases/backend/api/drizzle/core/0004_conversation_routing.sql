CREATE TABLE "deal_conversation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deal_id" uuid NOT NULL,
	"seller_organisation_id" uuid NOT NULL,
	"investor_organisation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_distinct_parties" CHECK ("deal_conversation"."seller_organisation_id" <> "deal_conversation"."investor_organisation_id")
);
--> statement-breakpoint
ALTER TABLE "deal_message" ADD COLUMN "conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "idempotency_key" ADD COLUMN "request_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "deal_conversation" ADD CONSTRAINT "deal_conversation_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_conversation" ADD CONSTRAINT "deal_conversation_seller_organisation_id_organisation_id_fk" FOREIGN KEY ("seller_organisation_id") REFERENCES "public"."organisation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_conversation" ADD CONSTRAINT "deal_conversation_investor_organisation_id_organisation_id_fk" FOREIGN KEY ("investor_organisation_id") REFERENCES "public"."organisation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_deal_investor_idx" ON "deal_conversation" USING btree ("deal_id","investor_organisation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_id_deal_idx" ON "deal_conversation" USING btree ("id","deal_id");--> statement-breakpoint
ALTER TABLE "deal_message" ADD CONSTRAINT "message_conversation_deal_fk" FOREIGN KEY ("conversation_id","deal_id") REFERENCES "public"."deal_conversation"("id","deal_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_message_conversation_idx" ON "deal_message" USING btree ("conversation_id","created_at","id");
--> statement-breakpoint
-- Routage déterministe : le premier intérêt identifie le fil de son organisation.
INSERT INTO deal_conversation (id, deal_id, seller_organisation_id, investor_organisation_id, created_at)
SELECT DISTINCT ON (i.deal_id, u.organisation_id)
  i.id, i.deal_id, d.seller_organisation_id, u.organisation_id, i.created_at
FROM interest i JOIN app_user u ON u.id = i.investor_user_id JOIN deal d ON d.id = i.deal_id
WHERE u.organisation_id <> d.seller_organisation_id
ORDER BY i.deal_id, u.organisation_id, i.created_at, i.id;
--> statement-breakpoint
-- Seule la nouvelle métadonnée de routage change. Aucun corps, auteur, date ou
-- intérêt historique n'est réécrit. Sans intérêt explicite cohérent, rester NULL.
DO $$
DECLARE protected boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'deal_message'::regclass AND tgname = 'trg_deal_message_append_only') INTO protected;
  IF protected THEN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'deal_message'::regclass AND tgname = 'trg_deal_message_append_only' AND tgenabled <> 'O') THEN
      RAISE EXCEPTION 'Vérifier le mode du trigger append-only avant migration';
    END IF;
    ALTER TABLE deal_message DISABLE TRIGGER trg_deal_message_append_only;
  END IF;
  UPDATE deal_message m SET conversation_id = c.id
  FROM interest i JOIN app_user investor ON investor.id = i.investor_user_id
  JOIN deal_conversation c ON c.deal_id = i.deal_id AND c.investor_organisation_id = investor.organisation_id
  WHERE m.interest_id = i.id AND m.deal_id = i.deal_id
    AND m.sender_organisation_id IN (c.seller_organisation_id, c.investor_organisation_id)
    AND EXISTS (SELECT 1 FROM app_user author WHERE author.id = m.sender_user_id AND author.organisation_id = m.sender_organisation_id);
  IF protected THEN ALTER TABLE deal_message ENABLE TRIGGER trg_deal_message_append_only; END IF;
END $$;
--> statement-breakpoint
CREATE FUNCTION conversation_integrity() RETURNS trigger AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Parties et conversation immuables' USING ERRCODE = 'check_violation'; END IF;
  IF NOT EXISTS (SELECT 1 FROM deal d WHERE d.id = NEW.deal_id AND d.seller_organisation_id = NEW.seller_organisation_id)
    OR NOT EXISTS (SELECT 1 FROM interest i JOIN app_user u ON u.id = i.investor_user_id WHERE i.deal_id = NEW.deal_id AND u.organisation_id = NEW.investor_organisation_id) THEN
    RAISE EXCEPTION 'Conversation sans parties et intérêt concordants' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_conversation_integrity BEFORE INSERT OR UPDATE OR DELETE ON deal_conversation FOR EACH ROW EXECUTE FUNCTION conversation_integrity();
--> statement-breakpoint
CREATE FUNCTION message_target_required() RETURNS trigger AS $$
DECLARE c deal_conversation;
BEGIN
  SELECT * INTO c FROM deal_conversation WHERE id = NEW.conversation_id AND deal_id = NEW.deal_id;
  IF NEW.conversation_id IS NULL OR c.id IS NULL
    OR NEW.sender_organisation_id NOT IN (c.seller_organisation_id, c.investor_organisation_id)
    OR NOT EXISTS (SELECT 1 FROM app_user u WHERE u.id = NEW.sender_user_id AND u.organisation_id = NEW.sender_organisation_id)
    OR (NEW.interest_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM interest i JOIN app_user u ON u.id = i.investor_user_id WHERE i.id = NEW.interest_id AND i.deal_id = c.deal_id AND u.organisation_id = c.investor_organisation_id)) THEN
    RAISE EXCEPTION 'Destinataire ou auteur incohérent' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_message_target BEFORE INSERT ON deal_message FOR EACH ROW EXECUTE FUNCTION message_target_required();
--> statement-breakpoint
ALTER TABLE deal_conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_conversation FORCE ROW LEVEL SECURITY;
CREATE POLICY conversation_party_read ON deal_conversation FOR SELECT USING (
  current_setting('app.organisation_id', true) IN (seller_organisation_id::text, investor_organisation_id::text)
);
CREATE POLICY conversation_investor_insert ON deal_conversation FOR INSERT WITH CHECK (
  investor_organisation_id::text = current_setting('app.organisation_id', true)
);
--> statement-breakpoint
ALTER TABLE deal_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_message FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deal_message_party ON deal_message;
CREATE POLICY message_party_read ON deal_message FOR SELECT USING (
  (conversation_id IS NOT NULL AND EXISTS (SELECT 1 FROM deal_conversation c WHERE c.id = deal_message.conversation_id AND c.deal_id = deal_message.deal_id))
  OR (conversation_id IS NULL AND (sender_organisation_id::text = current_setting('app.organisation_id', true)
    OR EXISTS (SELECT 1 FROM deal d WHERE d.id = deal_message.deal_id AND d.seller_organisation_id::text = current_setting('app.organisation_id', true))))
);
CREATE POLICY message_party_insert ON deal_message FOR INSERT WITH CHECK (
  conversation_id IS NOT NULL
  AND sender_organisation_id::text = current_setting('app.organisation_id', true)
  AND sender_user_id::text = current_setting('app.user_id', true)
  AND EXISTS (SELECT 1 FROM deal_conversation c WHERE c.id = deal_message.conversation_id AND c.deal_id = deal_message.deal_id)
);
--> statement-breakpoint
COMMENT ON TABLE deal_conversation IS 'INTERNAL : parties immuables, une conversation par dossier et organisation repreneuse';
COMMENT ON COLUMN deal_message.conversation_id IS 'INTERNAL : NULL uniquement pour historique non attribuable, conservé en lecture seule';
COMMENT ON COLUMN idempotency_key.request_hash IS 'INTERNAL : empreinte de la requête, anciennes réponses sans empreinte non rejouées';
