import { Global, Module } from "@nestjs/common";
import IORedis, { type Redis } from "ioredis";
import { loadEnv } from "../config/env.js";

/** Client Redis partagé : limitation de débit, verrouillages, compteurs. Un seul client par processus. */
export const REDIS = Symbol("REDIS");

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: (): Redis => new IORedis(loadEnv().REDIS_URL, { maxRetriesPerRequest: 2, enableOfflineQueue: false, lazyConnect: false }),
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
