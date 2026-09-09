import { Global, Module } from "@nestjs/common";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadEnv } from "../config/env.js";
import * as core from "./schema/core.js";
import * as vdr from "./schema/vdr.js";

/**
 * Deux connexions, deux bases, deux jeux d'identifiants (DP-OPS-042) :
 * CORE_DB : identité, institution, marketplace, finance.
 * VDR_DB  : documents, consultations, Q&R, preuves de NDA.
 * Une compromission en lecture de la marketplace ne doit jamais donner accès aux documents de la data room.
 */
export const CORE_DB = Symbol("CORE_DB");
export const VDR_DB = Symbol("VDR_DB");

export type CoreDb = PostgresJsDatabase<typeof core>;
export type VdrDb = PostgresJsDatabase<typeof vdr>;

function connect(url: string) {
  return postgres(url, { max: 10, idle_timeout: 20, connect_timeout: 10, prepare: false });
}

@Global()
@Module({
  providers: [
    {
      provide: CORE_DB,
      useFactory: (): CoreDb => drizzle(connect(loadEnv().DATABASE_URL_CORE), { schema: core }),
    },
    {
      provide: VDR_DB,
      useFactory: (): VdrDb => drizzle(connect(loadEnv().DATABASE_URL_VDR), { schema: vdr }),
    },
  ],
  exports: [CORE_DB, VDR_DB],
})
export class DatabaseModule {}
