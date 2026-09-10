import { Controller, HttpCode, Post, Req, UseInterceptors } from "@nestjs/common";
import { loadEnv } from "../../config/env.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { IdempotencyInterceptor } from "../../platform/idempotency.interceptor.js";
import { assertValidSignature, type RequestWithRawBody } from "../../platform/webhook-signature.js";
import { RemoBridgeService } from "./remo-bridge.service.js";

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
  @UseInterceptors(IdempotencyInterceptor)
  attendance(@Req() req: RequestWithRawBody) {
    const raw = assertValidSignature(req, "x-remo-signature", loadEnv().CONNECTOR_REMO_WEBHOOK_SECRET);
    const items = this.bridge.ingestAttendance(raw.toString("utf8"), req.header("x-remo-signature") ?? "", correlationIdOf(req));
    return { received: items.length };
  }
}
