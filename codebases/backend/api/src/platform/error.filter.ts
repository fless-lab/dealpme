import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { Request, Response } from "express";
import { errorRate } from "./observability.js";
import { ZodError } from "zod";
import { DealPmeError, ErrorCode, type ErrorEnvelope } from "@dealpme/contracts";
import { correlationIdOf } from "./correlation-id.middleware.js";

function isBodyParserError(e: unknown): e is { status: number; type?: string } {
  return typeof e === "object" && e !== null && "status" in e && typeof (e as { status: unknown }).status === "number" && (e as { status: number }).status >= 400 && (e as { status: number }).status < 500;
}

/**
 * Enveloppe d'erreur unique : { error: { code, message, details, correlationId } }.
 * Aucune trace interne ne sort. PERIMETER_BLOCKED reste distinct de FORBIDDEN.
 */
@Catch()
export class DealPmeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const correlationId = correlationIdOf(req);

    let status = 500;
    let body: ErrorEnvelope = { error: { code: ErrorCode.INTERNAL, message: "Erreur interne", correlationId } };

    if (exception instanceof DealPmeError) {
      status = exception.httpStatus;
      body = { error: { code: exception.code, message: exception.message, details: exception.details, correlationId } };
    } else if (exception instanceof ZodError) {
      status = 400;
      body = { error: { code: ErrorCode.VALIDATION_FAILED, message: "Requête invalide", details: exception.issues, correlationId } };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const code = status === 404 ? ErrorCode.NOT_FOUND : status === 401 ? ErrorCode.UNAUTHENTICATED : status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.INTERNAL;
      body = { error: { code, message: exception.message, correlationId } };
    } else if (isBodyParserError(exception)) {
      // Erreurs du parseur de corps (taille, JSON invalide) : levées avant Nest, jamais des erreurs serveur.
      status = exception.status === 413 ? 413 : 400;
      const code = status === 413 ? ErrorCode.PAYLOAD_TOO_LARGE : ErrorCode.VALIDATION_FAILED;
      body = { error: { code, message: status === 413 ? "Corps de requête trop volumineux (1 Mo maximum)" : "Corps de requête illisible", correlationId } };
    }
    if (status >= 500) {
      // Toute erreur serveur est journalisée avec sa corrélation ; jamais renvoyée au client.
      // Toute erreur serveur alimente le compteur lu par /health : une rafale de 5xx se voit sans attendre un appel.
      errorRate.record();
      // eslint-disable-next-line no-console
      console.error(`[${correlationId}]`, exception instanceof Error ? (exception.stack ?? exception.message) : exception);
    }
    res.status(status).json(body);
  }
}
