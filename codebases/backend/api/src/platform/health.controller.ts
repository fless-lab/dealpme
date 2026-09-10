import { Controller, Get, Inject } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { CORE_DB, VDR_DB, type CoreDb } from "../database/database.module.js";
import type { Redis } from "ioredis";
import { REDIS } from "./redis.js";
import { errorRate } from "./observability.js";

type Check = { name: string; ok: boolean; detail?: string };

/**
 * Sondes de disponibilité. /health répond tant que le processus vit ; /ready vérifie ce sans quoi
 * l'application ne peut pas servir : les deux bases et Redis. Un déploiement qui ne passe pas /ready
 * ne prend pas de trafic. Ces routes ne renvoient aucune donnée métier.
 */
@Controller()
export class HealthController {
  constructor(
    @Inject(CORE_DB) private readonly core: CoreDb,
    @Inject(VDR_DB) private readonly vdr: CoreDb,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get("health")
  health() {
    const errors = errorRate.countInWindow();
    return {
      status: errors >= 10 ? "degraded" : "ok",
      /** Nombre d'erreurs serveur sur les cinq dernières minutes : au-delà de dix, le service se déclare dégradé. */
      serverErrors5m: errors,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  @Get("ready")
  async ready() {
    const checks: Check[] = [];
    for (const [name, db] of [
      ["base core", this.core],
      ["base data room", this.vdr],
    ] as const) {
      try {
        await db.execute(sql`select 1`);
        checks.push({ name, ok: true });
      } catch (e) {
        checks.push({ name, ok: false, detail: e instanceof Error ? e.message : "erreur inconnue" });
      }
    }
    try {
      await this.redis.ping();
      checks.push({ name: "redis", ok: true });
    } catch (e) {
      checks.push({ name: "redis", ok: false, detail: e instanceof Error ? e.message : "erreur inconnue" });
    }
    const ready = checks.every((c) => c.ok);
    return { ready, checks };
  }
}
