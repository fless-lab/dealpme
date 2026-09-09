import { Controller, Headers, HttpCode, Post, Req, UseInterceptors } from "@nestjs/common";
import type { Request } from "express";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { IdempotencyInterceptor } from "../../platform/idempotency.interceptor.js";
import { RemoBridgeService } from "./remo-bridge.service.js";

/**
 * Réception des webhooks Remo (présence, fin d'événement). Idempotent : Remo peut renvoyer un même événement.
 * Le corps brut est nécessaire à la vérification de signature ; en production, configurer express.raw() sur cette route.
 */
@Controller("webhooks/remo")
export class RemoWebhookController {
  constructor(private readonly bridge: RemoBridgeService) {}

  @Post("attendance")
  @HttpCode(202)
  @UseInterceptors(IdempotencyInterceptor)
  attendance(@Req() req: Request, @Headers("x-remo-signature") signature?: string) {
    const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    const items = this.bridge.ingestAttendance(raw, signature ?? "", correlationIdOf(req));
    return { received: items.length };
  }
}
