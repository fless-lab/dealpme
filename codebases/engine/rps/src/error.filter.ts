import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { Request, Response } from "express";
import { ZodError } from "zod";
import { DealPmeError, ErrorCode, type ErrorEnvelope } from "@dealpme/contracts";

/** Même enveloppe d'erreur que l'API plateforme ; PERIMETER_BLOCKED (403) reste distinct de FORBIDDEN. */
@Catch()
export class RpsExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const correlationId = req.header("x-correlation-id") ?? "rps";
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
      body = { error: { code: status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.INTERNAL, message: exception.message, correlationId } };
    }
    if (status >= 500) {
      // eslint-disable-next-line no-console
      console.error(`[${correlationId}]`, exception instanceof Error ? (exception.stack ?? exception.message) : exception);
    }
    res.status(status).json(body);
  }
}
