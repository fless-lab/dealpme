import { z } from "zod";

/**
 * Enveloppe d'erreur standard (v0, section 9) :
 * { error: { code, message, details, correlationId } }
 * PERIMETER_BLOCKED (403) est distinct de FORBIDDEN pour qu'un blocage de conformité
 * ne soit jamais confondu avec un bug d'autorisation.
 */
export const ErrorCode = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  PERIMETER_BLOCKED: "PERIMETER_BLOCKED",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INVALID_TRANSITION: "INVALID_TRANSITION",
  IDEMPOTENCY_KEY_REQUIRED: "IDEMPOTENCY_KEY_REQUIRED",
  FEATURE_DISABLED: "FEATURE_DISABLED",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const httpStatusForCode: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  PERIMETER_BLOCKED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_TRANSITION: 409,
  IDEMPOTENCY_KEY_REQUIRED: 400,
  FEATURE_DISABLED: 403,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum(Object.values(ErrorCode) as [ErrorCode, ...ErrorCode[]]),
    message: z.string(),
    details: z.unknown().optional(),
    correlationId: z.string(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

export class DealPmeError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DealPmeError";
  }

  get httpStatus(): number {
    return httpStatusForCode[this.code];
  }
}
