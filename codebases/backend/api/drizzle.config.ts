import type { Config } from "drizzle-kit";

/** Base "core". La base "vdr" a sa propre configuration (drizzle.vdr.config.ts) et ses propres identifiants. */
export default {
  schema: "./src/database/schema/core.ts",
  out: "./drizzle/core",
  dialect: "postgresql",
  dbCredentials: { url: process.env["DATABASE_URL_CORE"] ?? "postgres://dealpme_core:dealpme_core@localhost:5432/dealpme_core" },
  strict: true,
  verbose: true,
} satisfies Config;
