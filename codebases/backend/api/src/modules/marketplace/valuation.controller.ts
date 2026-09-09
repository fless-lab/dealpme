import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { IndicativeValuationRequestSchema, type IndicativeValuationRequest } from "@dealpme/contracts";
import { Role } from "@dealpme/domain";
import { CurrentPrincipal, Roles, type Principal } from "../../platform/auth.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { validate } from "../../platform/zod.pipe.js";
import { ValuationService } from "./valuation.service.js";

@Controller("valuations")
export class ValuationController {
  constructor(private readonly valuation: ValuationService) {}

  @Post("indicative")
  @HttpCode(201)
  @Roles(Role.SELLER, Role.ADVISOR)
  compute(@Body(validate(IndicativeValuationRequestSchema)) body: IndicativeValuationRequest, @CurrentPrincipal() actor: Principal, @Req() req: Request) {
    return this.valuation.compute(body, actor, correlationIdOf(req));
  }
}
