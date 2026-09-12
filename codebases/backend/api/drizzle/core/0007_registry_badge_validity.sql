ALTER TABLE "certification" ADD COLUMN "registry_invalidated_at" timestamp with time zone;
--> statement-breakpoint
GRANT SELECT (registry_invalidated_at) ON certification TO dealpme_worker;
CREATE FUNCTION invalidate_registry_badge() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.legal_name,NEW.legal_form,NEW.rccm_number) IS DISTINCT FROM (OLD.legal_name,OLD.legal_form,OLD.rccm_number)
     OR (OLD.registry_record_id IS NOT NULL AND NEW.registry_record_id IS NULL) THEN
    UPDATE certification SET registry_invalidated_at=now()
      WHERE company_id=NEW.id AND decision='GRANTED' AND registry_invalidated_at IS NULL;
    INSERT INTO audit_event(id,action,actor_user_id,subject_type,subject_id,outcome,correlation_id,metadata)
      VALUES(gen_random_uuid(),'REGISTRY_PROOF_INVALIDATED',nullif(current_setting('app.user_id',true),'')::uuid,
        'company',NEW.id,'OK',gen_random_uuid()::text,'{"reason":"IDENTITY_OR_PROOF_CHANGED"}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER invalidate_registry_badge AFTER UPDATE ON company FOR EACH ROW EXECUTE FUNCTION invalidate_registry_badge();
