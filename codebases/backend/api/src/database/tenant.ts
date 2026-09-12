import { sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type * as core from "./schema/core.js";
import type { CoreDb } from "./database.module.js";
import type { Principal } from "../platform/auth.js";

export type CoreTx = PgTransaction<PostgresJsQueryResultHKT, typeof core, ExtractTablesWithRelations<typeof core>>;

/**
 * Contexte RLS par transaction. Les politiques de drizzle/core/rls.sql lisent
 * current_setting('app.organisation_id'), app.roles et app.user_id ; ce sont les seules
 * valeurs que le rôle applicatif dealpme_api peut positionner, et uniquement pour la transaction courante (SET LOCAL).
 * Sans principal (visiteur), aucun contexte : seules les lignes publiées restent lisibles.
 */
export function withTenant<T>(db: CoreDb, principal: Principal | null, fn: (tx: CoreTx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    if (principal) {
      // set_config(..., true) limite la valeur à la transaction ; paramètres liés, jamais concaténés.
      await tx.execute(sql`select set_config('app.organisation_id', ${principal.organisationId}, true), set_config('app.roles', ${principal.roles.join(",")}, true), set_config('app.user_id', ${principal.userId}, true)`);
    } else {
      await tx.execute(sql`select set_config('app.organisation_id', '', true), set_config('app.roles', '', true), set_config('app.user_id', '', true)`);
    }
    return fn(tx);
  });
}
