-- Politiques de sécurité au niveau des lignes et invariants (base core).
-- À exécuter après les migrations générées par drizzle-kit (npm run db:migrate puis psql -f drizzle/core/rls.sql).
-- L'API se connecte avec le rôle dealpme_api (NOBYPASSRLS) et positionne, par transaction :
--   SET LOCAL app.organisation_id = '<uuid>'; SET LOCAL app.roles = 'SELLER,INVESTOR';
-- Le code applicatif n'assemble jamais ces filtres à la main (exigence v0 : RLS au niveau de la donnée).

-- 1. Le type de cession est immuable après création (DP-RPS-001).
CREATE OR REPLACE FUNCTION deal_type_immutable() RETURNS trigger AS $$
BEGIN
  IF NEW.deal_type <> OLD.deal_type THEN
    RAISE EXCEPTION 'deal_type est immuable (DP-RPS-001)' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_deal_type_immutable ON deal;
CREATE TRIGGER trg_deal_type_immutable BEFORE UPDATE ON deal FOR EACH ROW EXECUTE FUNCTION deal_type_immutable();

-- 2. L'enregistrement d'attribution est immuable (DP-FIN-001).
CREATE OR REPLACE FUNCTION attribution_immutable() RETURNS trigger AS $$
BEGIN
  IF NEW.attribution_channel IS DISTINCT FROM OLD.attribution_channel
     OR NEW.attribution_campaign_id IS DISTINCT FROM OLD.attribution_campaign_id
     OR NEW.attribution_referral_code IS DISTINCT FROM OLD.attribution_referral_code
     OR NEW.attribution_captured_at IS DISTINCT FROM OLD.attribution_captured_at THEN
    RAISE EXCEPTION 'attribution immuable (DP-FIN-001)' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_attribution_immutable ON organisation;
CREATE TRIGGER trg_attribution_immutable BEFORE UPDATE ON organisation FOR EACH ROW EXECUTE FUNCTION attribution_immutable();

-- 3. Le compteur de divulgation n'est modifiable que par le RPS (service séparé) : interdit à l'API.
CREATE OR REPLACE FUNCTION disclosure_count_rps_only() RETURNS trigger AS $$
BEGIN
  IF NEW.disclosure_count <> OLD.disclosure_count AND current_setting('app.service', true) IS DISTINCT FROM 'rps' THEN
    RAISE EXCEPTION 'disclosure_count est maintenu par le RPS uniquement' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_disclosure_count ON deal;
CREATE TRIGGER trg_disclosure_count BEFORE UPDATE ON deal FOR EACH ROW EXECUTE FUNCTION disclosure_count_rps_only();

-- 4. Tables append-only : aucune mise à jour ni suppression (journal d'audit, événements de deal).
CREATE OR REPLACE FUNCTION append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'table append-only : % interdit', TG_OP USING ERRCODE = 'check_violation';
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_audit_append_only ON audit_event;
CREATE TRIGGER trg_audit_append_only BEFORE UPDATE OR DELETE ON audit_event FOR EACH ROW EXECUTE FUNCTION append_only();
DROP TRIGGER IF EXISTS trg_deal_event_append_only ON deal_event;
CREATE TRIGGER trg_deal_event_append_only BEFORE UPDATE OR DELETE ON deal_event FOR EACH ROW EXECUTE FUNCTION append_only();

-- 5. RLS sur les tables liées à un deal : le vendeur voit ses deals ; les autres voient uniquement les deals publiés
--    (la projection par palier T0/T1/T2 est faite par l'API via @dealpme/rules, la RLS ne fait que restreindre les lignes).
ALTER TABLE deal ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deal_owner ON deal;
CREATE POLICY deal_owner ON deal
  USING (seller_organisation_id::text = current_setting('app.organisation_id', true));
DROP POLICY IF EXISTS deal_listed_read ON deal;
CREATE POLICY deal_listed_read ON deal FOR SELECT
  USING (status IN ('LISTED_OPEN', 'LISTED_RESTRICTED', 'ENGAGED', 'DUE_DILIGENCE', 'NEGOTIATION'));
DROP POLICY IF EXISTS deal_officer_read ON deal;
CREATE POLICY deal_officer_read ON deal FOR SELECT
  USING (position('CCI_OFFICER' in coalesce(current_setting('app.roles', true), '')) > 0
      OR position('PLATFORM_ADMIN' in coalesce(current_setting('app.roles', true), '')) > 0);

ALTER TABLE asset_deal_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_deal_detail FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS asset_detail_owner ON asset_deal_detail;
CREATE POLICY asset_detail_owner ON asset_deal_detail
  USING (EXISTS (SELECT 1 FROM deal d WHERE d.id = asset_deal_detail.deal_id AND d.seller_organisation_id::text = current_setting('app.organisation_id', true)));

ALTER TABLE share_deal_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_deal_detail FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS share_detail_owner ON share_deal_detail;
CREATE POLICY share_detail_owner ON share_deal_detail
  USING (EXISTS (SELECT 1 FROM deal d WHERE d.id = share_deal_detail.deal_id AND d.seller_organisation_id::text = current_setting('app.organisation_id', true)));

ALTER TABLE indicative_valuation ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicative_valuation FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS valuation_owner ON indicative_valuation;
CREATE POLICY valuation_owner ON indicative_valuation
  USING (EXISTS (SELECT 1 FROM deal d WHERE d.id = indicative_valuation.deal_id AND d.seller_organisation_id::text = current_setting('app.organisation_id', true)));

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO dealpme_api;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO dealpme_api;

-- 6. Droits du rôle applicatif sur les tables futures (toute nouvelle migration est couverte sans intervention).
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO dealpme_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO dealpme_api;
-- Le rôle applicatif ne supprime jamais rien : l'effacement RGPD passe par une procédure dédiée du DPO.
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM dealpme_api;

-- 7. Événements et inscriptions : lecture publique des événements publiés, inscriptions visibles par leur auteur et l'organisateur.
ALTER TABLE event_registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registration FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS registration_self ON event_registration;
CREATE POLICY registration_self ON event_registration
  USING (EXISTS (SELECT 1 FROM app_user u WHERE u.id = event_registration.user_id AND u.organisation_id::text = current_setting('app.organisation_id', true)));
DROP POLICY IF EXISTS registration_officer ON event_registration;
CREATE POLICY registration_officer ON event_registration FOR SELECT
  USING (position('CCI_OFFICER' in coalesce(current_setting('app.roles', true), '')) > 0
      OR position('PLATFORM_ADMIN' in coalesce(current_setting('app.roles', true), '')) > 0);

ALTER TABLE diaspora_appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaspora_appointment FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS appointment_self ON diaspora_appointment;
CREATE POLICY appointment_self ON diaspora_appointment
  USING (EXISTS (SELECT 1 FROM app_user u WHERE u.id = diaspora_appointment.investor_user_id AND u.organisation_id::text = current_setting('app.organisation_id', true)));
DROP POLICY IF EXISTS appointment_officer ON diaspora_appointment;
CREATE POLICY appointment_officer ON diaspora_appointment
  USING (position('CCI_OFFICER' in coalesce(current_setting('app.roles', true), '')) > 0
      OR position('PLATFORM_ADMIN' in coalesce(current_setting('app.roles', true), '')) > 0);

-- 8. Le rôle applicatif ne peut pas modifier les politiques ni les triggers (pas propriétaire des objets).
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO dealpme_api;
