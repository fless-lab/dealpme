import { Controller, HttpCode, Post, Req, UseInterceptors, UseGuards, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { loadEnv } from "../../config/env.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { IdempotencyInterceptor, type IdempotentRequest } from "../../platform/idempotency.interceptor.js";
import { AuditService } from "../../platform/audit.service.js";
import { assertValidSignature, type RequestWithRawBody } from "../../platform/webhook-signature.js";
import { RemoBridgeService } from "./remo-bridge.service.js";

@Injectable()
export class RemoSignatureGuard implements CanActivate {
  constructor(private readonly audit: AuditService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestWithRawBody>();
    try {
      assertValidSignature(req, "x-remo-signature", loadEnv().CONNECTOR_REMO_WEBHOOK_SECRET);
      return true;
    } catch (error) {
      await this.audit.rejection({ action: "WEBHOOK_REJECTED", actorUserId: null, subjectType: "webhook", subjectId: "remo-attendance", outcome: "BLOCKED", correlationId: correlationIdOf(req) });
      throw error;
    }
  }
}

/**
 * Réception des webhooks Remo (présence, fin d'événement).
 * Ordre des contrôles : signature HMAC sur le corps brut, puis idempotence (Remo peut renvoyer un même événement),
 * puis traitement. Un secret absent équivaut à un refus.
 */
@Controller("webhooks/remo")
export class RemoWebhookController {
  constructor(private readonly bridge: RemoBridgeService) {}

  @Post("attendance")
  @HttpCode(202)
  @UseGuards(RemoSignatureGuard)
  @UseInterceptors(IdempotencyInterceptor)
  async attendance(@Req() req: RequestWithRawBody & IdempotentRequest) {
    const raw = assertValidSignature(req, "x-remo-signature", loadEnv().CONNECTOR_REMO_WEBHOOK_SECRET);
    if (!req.idempotencyTx) throw new Error("Transaction d'idempotence absente");
    const items = await this.bridge.ingestAttendance(raw.toString("utf8"), req.header("x-remo-signature") ?? "", correlationIdOf(req), req.idempotencyTx);
    return { received: items.length };
  }
}
