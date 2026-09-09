import type { Config } from "drizzle-kit";

/** Base "vdr" : schéma et identifiants distincts de la marketplace (DP-OPS-042). */
export default {
  schema: "./src/database/schema/vdr.ts",
  out: "./drizzle/vdr",
  dialect: "postgresql",
  dbCredentials: { url: process.env["DATABASE_URL_VDR"] ?? "postgres://dealpme_vdr:dealpme_vdr@localhost:5433/dealpme_vdr" },
  strict: true,
  verbose: true,
} satisfies Config;
