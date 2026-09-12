import { Controller, Get, Header, Inject, Res } from "@nestjs/common";
import type { Response } from "express";
import { sql } from "drizzle-orm";
import { CORE_DB, VDR_DB, type CoreDb } from "../database/database.module.js";
import type { Redis } from "ioredis";
import { REDIS } from "./redis.js";
import { errorRate } from "./observability.js";

type Check = { name: string; ok: boolean };

async function bounded(work: PromiseLike<unknown>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Probe timeout")), 2000); })]); }
  finally { clearTimeout(timer); }
}

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
  async ready(@Res({ passthrough: true }) response: Response) {
    const checks: Check[] = [];
    for (const [name, db] of [
      ["base core", this.core],
      ["base data room", this.vdr],
    ] as const) {
      try {
        await bounded(db.execute(sql`select 1`));
        checks.push({ name, ok: true });
      } catch {
        checks.push({ name, ok: false });
      }
    }
    try {
      await bounded(this.redis.ping());
      checks.push({ name: "redis", ok: true });
    } catch {
      checks.push({ name: "redis", ok: false });
    }
    const ready = checks.every((c) => c.ok);
    response.status(ready ? 200 : 503);
    return { ready, checks };
  }

  @Get("metrics")
  @Header("Content-Type", "text/plain; version=0.0.4")
  metrics() {
    return `# TYPE dealpme_server_errors_5m gauge\ndealpme_server_errors_5m ${errorRate.countInWindow()}\n# TYPE dealpme_uptime_seconds gauge\ndealpme_uptime_seconds ${Math.floor(process.uptime())}\n`;
  }
}
