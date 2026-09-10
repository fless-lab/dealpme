import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";

/**
 * Vérification HMAC-SHA256 des webhooks (registre S06). Le corps brut est capturé par le parseur JSON
 * (voir main.ts) : la signature se calcule sur les octets reçus, jamais sur l'objet ré-sérialisé.
 * Comparaison en temps constant. Un secret absent équivaut à un refus : jamais de mode "ouvert" par défaut.
 */
export type RequestWithRawBody = Request & { rawBody?: Buffer };

export function computeSignature(rawBody: Buffer | string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function assertValidSignature(req: RequestWithRawBody, headerName: string, secret: string | undefined): Buffer {
  if (!secret) {
    throw new DealPmeError(ErrorCode.FORBIDDEN, `Webhook refusé : aucun secret configuré pour ${headerName}`);
  }
  const raw = req.rawBody ?? Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}));
  const provided = (req.header(headerName) ?? "").trim().replace(/^sha256=/, "");
  const expected = computeSignature(raw, secret);
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new DealPmeError(ErrorCode.FORBIDDEN, "Signature de webhook invalide");
  }
  return raw;
}
