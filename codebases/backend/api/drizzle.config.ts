import type { Config } from "drizzle-kit";

/** Base "core". La base "vdr" a sa propre configuration (drizzle.vdr.config.ts) et ses propres identifiants. */
export default {
  schema: "./src/database/schema/core.ts",
  out: "./drizzle/core",
  dialect: "postgresql",
  // Les migrations s'exécutent avec le rôle propriétaire, jamais avec le rôle applicatif.
  dbCredentials: { url: process.env["DATABASE_URL_CORE_ADMIN"] ?? "postgres://dealpme_core:dealpme_core@localhost:5432/dealpme_core" },
  strict: true,
  verbose: true,
} satisfies Config;
