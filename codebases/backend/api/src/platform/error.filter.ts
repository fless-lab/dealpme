import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { Request, Response } from "express";
import { ZodError } from "zod";
import { DealPmeError, ErrorCode, type ErrorEnvelope } from "@dealpme/contracts";
import { correlationIdOf } from "./correlation-id.middleware.js";

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
    } else {
      // eslint-disable-next-line no-console
      console.error(`[${correlationId}]`, exception);
    }
    res.status(status).json(body);
  }
}
