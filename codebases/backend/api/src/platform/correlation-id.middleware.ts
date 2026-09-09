import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const CORRELATION_HEADER = "x-correlation-id";

/** Chaque requête porte un identifiant de corrélation, repris dans les journaux et l'enveloppe d'erreur. */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(CORRELATION_HEADER);
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
  (req as Request & { correlationId: string }).correlationId = id;
  res.setHeader(CORRELATION_HEADER, id);
  next();
}

export function correlationIdOf(req: Request): string {
  return (req as Request & { correlationId?: string }).correlationId ?? "sans-correlation";
}
