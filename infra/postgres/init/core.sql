-- Base "core" (marketplace, identité, institution, finance).
-- Les tables liées à un deal sont protégées par sécurité au niveau des lignes (RLS) ;
-- les politiques sont créées par les migrations Drizzle de codebases/backend/api.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Rôle applicatif sans droit de contournement de la RLS (le rôle propriétaire ne doit pas être utilisé par l'API).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dealpme_api') THEN
    CREATE ROLE dealpme_api LOGIN PASSWORD 'dealpme_api' NOBYPASSRLS;
  END IF;
END $$;
GRANT CONNECT ON DATABASE dealpme_core TO dealpme_api;
