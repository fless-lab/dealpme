import type { Config } from "drizzle-kit";

/** Datastore propre au RPS (DP-RPS-010) : jamais partagé avec la marketplace ni la data room. */
export default {
  schema: "./src/database/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env["DATABASE_URL_RPS"] ?? "postgres://dealpme_rps:dealpme_rps@localhost:5434/dealpme_rps" },
  strict: true,
} satisfies Config;
