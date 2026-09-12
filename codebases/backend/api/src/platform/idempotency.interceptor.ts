import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from "@nestjs/common";
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Request, Response } from "express";
import { Observable, from, lastValueFrom } from "rxjs";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { CORE_DB, type CoreDb } from "../database/database.module.js";
import type { CoreTx } from "../database/tenant.js";
import { idempotencyKeys } from "../database/schema/core.js";

export type IdempotentRequest = Request & { rawBody?: Buffer; idempotencyTx?: CoreTx };

/** La garde de signature s'exécute avant le cache. Effets, audit et réponse sont atomiques. */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(CORE_DB) private readonly db: CoreDb) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<IdempotentRequest>();
    const response = ctx.switchToHttp().getResponse<Response>();
    const key = req.header("idempotency-key");
    if (!key || key.length > 128) throw new DealPmeError(ErrorCode.IDEMPOTENCY_KEY_REQUIRED, "En-tête Idempotency-Key obligatoire sur cet endpoint");
    const scoped = `${req.method}:${req.path}:${key}`;
    const requestHash = createHash("sha256").update(req.rawBody ?? JSON.stringify(req.body ?? null)).digest("hex");
    return from(this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${scoped}, 0))`);
      const cached = (await tx.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, scoped)).limit(1))[0];
      if (cached) {
        if (cached.requestHash !== requestHash) throw new DealPmeError(ErrorCode.CONFLICT, "Clé déjà utilisée avec un autre contenu ou une ancienne réponse sans empreinte");
        response.status(cached.responseStatus);
        return cached.responseBody;
      }
      req.idempotencyTx = tx;
      try {
        const value = await lastValueFrom(next.handle());
        await tx.insert(idempotencyKeys).values({ key: scoped, requestHash, responseStatus: response.statusCode, responseBody: value ?? {} });
        return value;
      } finally {
        delete req.idempotencyTx;
      }
    }));
  }
}
