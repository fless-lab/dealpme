import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Schéma de la base "vdr" (V2), volontairement séparé de la base core : identifiants distincts,
 * aucune clé étrangère croisée (les identifiants de deal et de personne sont recopiés, pas référencés).
 * Rétention : corps des documents purgé 90 jours après clôture ; métadonnées d'audit conservées 10 ans.
 */
export const documentStatusEnum = pgEnum("document_status", [
  "UPLOADED", "SCANNING", "PROCESSING", "REVIEW_REQUIRED", "PUBLISHED", "SUPERSEDED", "REVOKED", "QUARANTINED",
]);
export const signatureMethodEnum = pgEnum("signature_method", ["QUALIFIED_ELECTRONIC", "WET_INK_COUNTERSIGNED"]);

const id = () => uuid("id").primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const dataRooms = pgTable("data_room", {
  id: id(),
  dealId: uuid("deal_id").notNull(), // copie, pas de FK vers core
  createdAt: createdAt(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

/** Arborescence OHADA par défaut : corporate, financier, fiscal, social, contrats, actifs, litiges, permis. */
export const folders = pgTable("folder", {
  id: id(),
  dataRoomId: uuid("data_room_id").notNull().references(() => dataRooms.id),
  parentId: uuid("parent_id"),
  code: varchar("code", { length: 32 }).notNull(), // CORPORATE | FINANCIAL | TAX | EMPLOYMENT | CONTRACTS | ASSETS | LITIGATION | PERMITS
  title: varchar("title", { length: 160 }).notNull(),
  cleanTeam: boolean("clean_team").notNull().default(false),
});

export const documents = pgTable(
  "document",
  {
    id: id(),
    dataRoomId: uuid("data_room_id").notNull().references(() => dataRooms.id),
    folderId: uuid("folder_id").notNull().references(() => folders.id),
    title: varchar("title", { length: 200 }).notNull(), // CONFIDENTIAL_DEAL
    type: varchar("type", { length: 32 }).notNull(),
    version: integer("version").notNull().default(1),
    status: documentStatusEnum("status").notNull().default("UPLOADED"),
    tier: varchar("tier", { length: 2 }).notNull().default("T2"),
    cleanTeam: boolean("clean_team").notNull().default(false),
    storageKey: varchar("storage_key", { length: 512 }).notNull(), // clé objet, jamais une URL publique
    sha256: varchar("sha256", { length: 64 }).notNull(),
    pageCount: integer("page_count"),
    downloadAllowed: boolean("download_allowed").notNull().default(false), // désactivé par défaut (DOC-01)
    classification: varchar("classification", { length: 32 }).notNull().default("CONFIDENTIAL_DEAL"),
    createdAt: createdAt(),
  },
  (t) => [index("document_room_idx").on(t.dataRoomId, t.folderId)],
);

/** Accès scopé à un ensemble de documents avec expiration obligatoire (DP-VDR-010). */
export const accessGrants = pgTable(
  "access_grant",
  {
    id: id(),
    dataRoomId: uuid("data_room_id").notNull().references(() => dataRooms.id),
    personId: uuid("person_id").notNull(), // copie
    folderIds: jsonb("folder_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    cleanTeam: boolean("clean_team").notNull().default(false),
    downloadAllowed: boolean("download_allowed").notNull().default(false),
    aiAllowed: boolean("ai_allowed").notNull().default(false),
    justification: text("justification").notNull(),
    grantedBy: uuid("granted_by").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // jamais nul : pas d'accès perpétuel
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("grant_person_idx").on(t.personId, t.dataRoomId)],
);

export const documentViews = pgTable(
  "document_view",
  {
    id: id(),
    documentId: uuid("document_id").notNull().references(() => documents.id),
    personId: uuid("person_id").notNull(),
    page: integer("page").notNull(),
    ipHash: varchar("ip_hash", { length: 128 }),
    clientLabel: varchar("client_label", { length: 120 }),
    durationMs: integer("duration_ms"),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("view_document_idx").on(t.documentId, t.viewedAt)],
);

export const qaThreads = pgTable("qa_thread", {
  id: id(),
  dataRoomId: uuid("data_room_id").notNull().references(() => dataRooms.id),
  documentId: uuid("document_id"),
  category: varchar("category", { length: 32 }).notNull(),
  authorPersonId: uuid("author_person_id").notNull(),
  visibility: varchar("visibility", { length: 16 }).notNull().default("PRIVATE"), // PRIVATE | SHARED
  status: varchar("status", { length: 16 }).notNull().default("OPEN"),
  question: text("question").notNull(), // CONFIDENTIAL_DEAL
  answer: text("answer"),
  answeredBy: uuid("answered_by"),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const ndaInstances = pgTable("nda_instance", {
  id: id(),
  dealId: uuid("deal_id").notNull(),
  personId: uuid("person_id").notNull(),
  templateVersion: varchar("template_version", { length: 32 }).notNull(),
  documentSha256: varchar("document_sha256", { length: 64 }).notNull(),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const signatureEvidences = pgTable("signature_evidence", {
  id: id(),
  ndaInstanceId: uuid("nda_instance_id").notNull().references(() => ndaInstances.id),
  method: signatureMethodEnum("method").notNull(),
  providerRef: varchar("provider_ref", { length: 200 }),
  certificateChain: text("certificate_chain"), // stockée, pas seulement validée
  timestampToken: text("timestamp_token"),
  documentSha256: varchar("document_sha256", { length: 64 }).notNull(),
  archiveRef: varchar("archive_ref", { length: 200 }), // référence PSAE
  createdAt: createdAt(),
});
