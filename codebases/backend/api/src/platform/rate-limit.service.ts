import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Redis } from "ioredis";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { REDIS } from "./redis.js";

/**
 * Anti-force-brute (registre de sécurité S02).
 * Fenêtres glissantes dans Redis : par IP et par compte. Verrouillage progressif du compte :
 * la durée double à chaque verrouillage successif (15 min, 30 min, 1 h, plafonnée à 24 h).
 * En cas d'indisponibilité de Redis, on refuse (fail-closed) : mieux vaut un 503 qu'une porte ouverte.
 */
export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

export const RULES = {
  LOGIN_PER_IP: { limit: 20, windowSeconds: 60 } satisfies RateLimitRule,
  LOGIN_FAILURES_PER_ACCOUNT: { limit: 5, windowSeconds: 60 } satisfies RateLimitRule,
  OTP_ATTEMPTS_PER_CHALLENGE: { limit: 5, windowSeconds: 600 } satisfies RateLimitRule,
  API_PER_IP: { limit: 300, windowSeconds: 60 } satisfies RateLimitRule,
  REGISTER_PER_IP: { limit: 5, windowSeconds: 3600 } satisfies RateLimitRule,
} as const;

const LOCK_BASE_SECONDS = 15 * 60;
const LOCK_MAX_SECONDS = 24 * 3600;
const LOCK_AFTER_FAILURES = 10; // sur 15 minutes

@Injectable()
export class RateLimitService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  /** Empreinte stable et non réversible d'une IP ou d'un identifiant (jamais la valeur brute dans Redis ni dans les journaux). */
  static fingerprint(value: string): string {
    return createHash("sha256").update(value.toLowerCase()).digest("hex").slice(0, 32);
  }

  /** Incrémente un compteur fenêtré ; lève RATE_LIMITED au-delà de la limite. */
  async hit(scope: string, key: string, rule: RateLimitRule): Promise<void> {
    const redisKey = `rl:${scope}:${RateLimitService.fingerprint(key)}`;
    let count: number;
    try {
      count = await this.redis.incr(redisKey);
      if (count === 1) await this.redis.expire(redisKey, rule.windowSeconds);
    } catch {
      throw new DealPmeError(ErrorCode.INTERNAL, "Service de limitation indisponible");
    }
    if (count > rule.limit) {
      throw new DealPmeError(ErrorCode.RATE_LIMITED, "Trop de tentatives. Réessayez plus tard.", { retryAfterSeconds: rule.windowSeconds });
    }
  }

  /** Refuse si le compte est verrouillé. */
  async assertNotLocked(account: string): Promise<void> {
    const ttl = await this.redis.ttl(`lock:${RateLimitService.fingerprint(account)}`);
    if (ttl > 0) {
      throw new DealPmeError(ErrorCode.RATE_LIMITED, "Compte temporairement verrouillé après plusieurs échecs.", { retryAfterSeconds: ttl });
    }
  }

  /** Enregistre un échec de connexion ; verrouille progressivement au-delà du seuil. Renvoie la durée de verrouillage appliquée, sinon 0. */
  async recordFailure(account: string): Promise<number> {
    const fp = RateLimitService.fingerprint(account);
    const failKey = `fail:${fp}`;
    const failures = await this.redis.incr(failKey);
    if (failures === 1) await this.redis.expire(failKey, 15 * 60);
    if (failures < LOCK_AFTER_FAILURES) return 0;
    const strikes = await this.redis.incr(`strikes:${fp}`);
    await this.redis.expire(`strikes:${fp}`, LOCK_MAX_SECONDS);
    const lockSeconds = Math.min(LOCK_MAX_SECONDS, LOCK_BASE_SECONDS * 2 ** (strikes - 1));
    await this.redis.set(`lock:${fp}`, "1", "EX", lockSeconds);
    await this.redis.del(failKey);
    return lockSeconds;
  }

  async clearFailures(account: string): Promise<void> {
    await this.redis.del(`fail:${RateLimitService.fingerprint(account)}`);
  }
}
