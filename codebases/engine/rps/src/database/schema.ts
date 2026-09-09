import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Schéma du RPS. Tables append-only : disclosure et regulatory_log_entry (un trigger interdit UPDATE/DELETE).
 * Le journal est chaîné par hachage : chaque entrée contient le hash de la précédente.
 */
export const tierEnum = pgEnum("disclosure_tier", ["T0", "T1", "T2"]);
export const admissionDecisionEnum = pgEnum("admission_decision", ["ADMITTED", "REFUSED", "WAITLISTED", "REVOKED"]);

const id = () => uuid("id").primaryKey();

/** Paramètres de cercle par deal : plafond (défaut 50), mode d'admission. */
export const circles = pgTable("circle", {
  dealId: uuid("deal_id").primaryKey(),
  dealType: varchar("deal_type", { length: 16 }).notNull(), // ASSET_DEAL | SHARE_DEAL
  legalForm: varchar("legal_form", { length: 16 }),
  cap: integer("cap").notNull().default(50),
  manualAdmissionOnly: integer("manual_admission_only").notNull().default(1), // toujours 1 : l'admission est humaine
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Groupe de personnes liées : comptées une seule fois dans le compteur de divulgation. */
export const relatedPersonGroups = pgTable("related_person_group", {
  id: id(),
  label: varchar("label", { length: 160 }).notNull(),
  personIds: jsonb("person_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Table critique de conformité : append-only. La révocation ajoute une ligne, ne supprime jamais. */
export const disclosures = pgTable(
  "disclosure",
  {
    id: id(),
    dealId: uuid("deal_id").notNull(),
    personId: uuid("person_id").notNull(), // personne, jamais session ni compte
    tier: tierEnum("tier").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    grantedBy: uuid("granted_by"), // obligatoire à partir de T1 : décision humaine
    basis: text("basis").notNull(),
    relatedPersonGroupId: uuid("related_person_group_id"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("disclosure_deal_idx").on(t.dealId, t.personId)],
);

export const admissionDecisions = pgTable("admission_decision", {
  id: id(),
  dealId: uuid("deal_id").notNull(),
  personId: uuid("person_id").notNull(),
  decision: admissionDecisionEnum("decision").notNull(),
  decidedBy: uuid("decided_by").notNull(), // opérateur de conformité, jamais un automate (DP-RPS-031)
  justification: text("justification").notNull(),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Journal réglementaire chaîné par hachage, rétention indéfinie. */
export const regulatoryLogEntries = pgTable(
  "regulatory_log_entry",
  {
    id: id(),
    sequence: integer("sequence").notNull(),
    dealId: uuid("deal_id"),
    action: varchar("action", { length: 64 }).notNull(),
    payload: jsonb("payload").notNull(), // identifiants et décisions uniquement, jamais de contenu confidentiel
    previousHash: varchar("previous_hash", { length: 64 }).notNull(),
    hash: varchar("hash", { length: 64 }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reglog_seq_idx").on(t.sequence)],
);
