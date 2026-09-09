import { Global, Module } from "@nestjs/common";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export const RPS_DB = Symbol("RPS_DB");
export type RpsDb = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: RPS_DB,
      useFactory: (): RpsDb => {
        const url = process.env["DATABASE_URL_RPS"];
        if (!url) throw new Error("DATABASE_URL_RPS manquant : le RPS a sa propre base");
        return drizzle(postgres(url, { max: 5, prepare: false }), { schema });
      },
    },
  ],
  exports: [RPS_DB],
})
export class RpsDatabaseModule {}
