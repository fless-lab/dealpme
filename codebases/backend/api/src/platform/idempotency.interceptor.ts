import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Request } from "express";
import { Observable, from, of, switchMap, tap } from "rxjs";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { CORE_DB, type CoreDb } from "../database/database.module.js";
import { idempotencyKeys } from "../database/schema/core.js";

/**
 * Idempotence des POST créateurs d'état (registre S06) : l'en-tête Idempotency-Key est obligatoire
 * sur les endpoints de paiement et de webhook ; la réponse d'origine est rejouée à l'identique.
 * Persistance dans la table idempotency_key (base core) : survit aux redémarrages et aux répliques.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(CORE_DB) private readonly db: CoreDb) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const key = req.header("idempotency-key");
    if (!key || key.length > 128) {
      throw new DealPmeError(ErrorCode.IDEMPOTENCY_KEY_REQUIRED, "En-tête Idempotency-Key obligatoire sur cet endpoint");
    }
    const scoped = `${req.method}:${req.path}:${key}`;
    return from(this.db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, scoped)).limit(1)).pipe(
      switchMap((rows) => {
        const cached = rows[0];
        if (cached) {
          return of(cached.responseBody);
        }
        return next.handle().pipe(
          tap((value) => {
            void this.db
              .insert(idempotencyKeys)
              .values({ key: scoped, responseStatus: 200, responseBody: value as object })
              .onConflictDoNothing()
              .catch((err: unknown) => {
                // eslint-disable-next-line no-console
                console.error("[idempotence] écriture impossible :", err);
              });
          }),
        );
      }),
    );
  }
}
