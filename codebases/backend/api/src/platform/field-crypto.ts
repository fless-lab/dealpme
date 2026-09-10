import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Chiffrement applicatif des champs CONFIDENTIAL_DEAL (registre S04).
 * AES-256-GCM, clé gérée hors base (variable d'environnement, coffre en production), identifiant de clé
 * en préfixe pour la rotation : "<keyId>:<base64(iv | tag | chiffré)>".
 * Rotation : publier FIELD_ENCRYPTION_KEY (nouvelle) + FIELD_ENCRYPTION_KEY_PREVIOUS (ancienne) ; les lectures
 * acceptent les deux, les écritures utilisent la nouvelle ; un script de re-chiffrement peut ensuite migrer
 * les lignes portant l'ancien identifiant (voir docs/SECURITY_KEY_ROTATION.md).
 */
export interface KeyRing {
  currentId: string;
  current: Buffer;
  previous?: { id: string; key: Buffer } | undefined;
}

function toKey(material: string): Buffer {
  const b64 = Buffer.from(material, "base64");
  if (b64.length === 32) return b64;
  // Matériel non base64 de 32 octets : dérivation SHA-256 (développement uniquement ; en production, fournir 32 octets base64).
  return createHash("sha256").update(material).digest();
}

export function keyRingFromEnv(env: { FIELD_ENCRYPTION_KEY: string; FIELD_ENCRYPTION_KEY_ID?: string | undefined; FIELD_ENCRYPTION_KEY_PREVIOUS?: string | undefined; FIELD_ENCRYPTION_KEY_PREVIOUS_ID?: string | undefined }): KeyRing {
  const previous = env.FIELD_ENCRYPTION_KEY_PREVIOUS ? { id: env.FIELD_ENCRYPTION_KEY_PREVIOUS_ID ?? "v0", key: toKey(env.FIELD_ENCRYPTION_KEY_PREVIOUS) } : undefined;
  return { currentId: env.FIELD_ENCRYPTION_KEY_ID ?? "v1", current: toKey(env.FIELD_ENCRYPTION_KEY), previous };
}

export function encryptField(ring: KeyRing, plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ring.current, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ring.currentId}:${Buffer.concat([iv, tag, enc]).toString("base64")}`;
}

export function decryptField(ring: KeyRing, stored: string): string {
  const sep = stored.indexOf(":");
  if (sep < 0) throw new Error("Champ chiffré mal formé");
  const keyId = stored.slice(0, sep);
  const key = keyId === ring.currentId ? ring.current : ring.previous?.id === keyId ? ring.previous.key : undefined;
  if (!key) throw new Error(`Clé de chiffrement inconnue : ${keyId}`);
  const buf = Buffer.from(stored.slice(sep + 1), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function encryptInt(ring: KeyRing, value: number | null): string | null {
  return value === null ? null : encryptField(ring, String(value));
}

export function decryptInt(ring: KeyRing, stored: string | null): number | null {
  if (stored === null) return null;
  const n = Number(decryptField(ring, stored));
  if (!Number.isSafeInteger(n)) throw new Error("Valeur chiffrée non entière");
  return n;
}

export function keyIdOf(stored: string): string {
  return stored.slice(0, stored.indexOf(":"));
}
