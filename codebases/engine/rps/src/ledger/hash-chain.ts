import { createHash } from "node:crypto";

/**
 * Chaînage par hachage du journal réglementaire (DP-RPS-010).
 * hash = SHA-256(sequence | previousHash | action | payload canonique | recordedAt)
 * Le pack de preuves d'un dossier est vérifiable sans accès au code source.
 */
export const GENESIS_HASH = "0".repeat(64);

export interface LogEntryInput {
  sequence: number;
  previousHash: string;
  action: string;
  payload: Record<string, unknown>;
  recordedAt: string; // ISO 8601
}

/** Sérialisation canonique : clés triées récursivement, pour un hash stable. */
export function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function computeHash(entry: LogEntryInput): string {
  const material = [entry.sequence, entry.previousHash, entry.action, canonicalize(entry.payload), entry.recordedAt].join("|");
  return createHash("sha256").update(material).digest("hex");
}

export interface ChainedEntry extends LogEntryInput {
  hash: string;
}

/** Vérifie l'intégrité d'une suite d'entrées : séquence continue, chaînage correct, hash exact. */
export function verifyChain(entries: ChainedEntry[]): { valid: boolean; brokenAt: number | null } {
  let previous = GENESIS_HASH;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    if (e.sequence !== i + 1 || e.previousHash !== previous || computeHash(e) !== e.hash) {
      return { valid: false, brokenAt: e.sequence };
    }
    previous = e.hash;
  }
  return { valid: true, brokenAt: null };
}
