import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { Observable, from, of, tap } from "rxjs";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";

/**
 * Idempotence des POST créateurs d'état (convention v0) : l'en-tête Idempotency-Key est obligatoire
 * sur les endpoints de paiement et de webhook, et la réponse d'origine est rejouée à l'identique.
 * Le stockage en mémoire ci-dessous est un point de départ ; la table idempotency_key de la base core
 * est la cible (voir schema/core.ts) pour survivre aux redémarrages et aux répliques.
 */
export interface IdempotencyStore {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly map = new Map<string, unknown>();
  async get(key: string): Promise<unknown | undefined> {
    return this.map.get(key);
  }
  async set(key: string, value: unknown): Promise<void> {
    this.map.set(key, value);
  }
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly store: IdempotencyStore = new MemoryIdempotencyStore()) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const key = req.header("idempotency-key");
    if (!key) {
      throw new DealPmeError(ErrorCode.IDEMPOTENCY_KEY_REQUIRED, "En-tête Idempotency-Key obligatoire sur cet endpoint");
    }
    const scoped = `${req.method}:${req.path}:${key}`;
    return from(this.store.get(scoped)).pipe(
      (source) =>
        new Observable((subscriber) => {
          source.subscribe({
            next: (cached) => {
              if (cached !== undefined) {
                of(cached).subscribe(subscriber);
              } else {
                next
                  .handle()
                  .pipe(tap((value) => void this.store.set(scoped, value)))
                  .subscribe(subscriber);
              }
            },
            error: (e) => subscriber.error(e),
          });
        }),
    );
  }
}
