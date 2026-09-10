import { createClamAvAdapter, createFakeAntivirus, type AntivirusPort } from "@dealpme/connector-antivirus";
import { createFakeStorage, createS3Adapter, type StoragePort } from "@dealpme/connector-storage";
import { loadEnv } from "../../config/env.js";

export const STORAGE_PORT = Symbol("STORAGE_PORT");
export const ANTIVIRUS_PORT = Symbol("ANTIVIRUS_PORT");

/**
 * Stockage objet : MinIO en local, S3 compatible en production. Le faux stockage en mémoire n'est
 * accepté qu'en test automatisé ; en développement comme en production, les pièces vont sur le vrai stockage,
 * pour que le chiffrement au repos et l'absence d'URL publique soient éprouvés à chaque exécution.
 */
export function storagePortFactory(): StoragePort {
  const env = loadEnv();
  if (env.NODE_ENV === "test") return createFakeStorage();
  return createS3Adapter({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    forcePathStyle: true,
  });
}

/**
 * Antivirus : ClamAV dès qu'il est configuré. Le faux moteur (reconnaissance EICAR) sert au développement
 * et aux tests ; il est refusé en production, où un dépôt sans moteur réel serait une porte ouverte.
 */
export function antivirusPortFactory(): AntivirusPort {
  const env = loadEnv();
  if (env.CONNECTOR_ANTIVIRUS_MODE === "clamav") {
    return createClamAvAdapter({ host: env.CLAMAV_HOST, port: env.CLAMAV_PORT });
  }
  if (env.NODE_ENV === "production") {
    throw new Error("CONNECTOR_ANTIVIRUS_MODE=clamav est obligatoire en production : aucun dépôt de pièce sans moteur réel");
  }
  return createFakeAntivirus();
}
