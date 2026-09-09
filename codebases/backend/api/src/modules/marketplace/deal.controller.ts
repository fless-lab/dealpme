import { Body, Controller, HttpCode, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { CreateDealRequestSchema, IdSchema, type CreateDealRequest } from "@dealpme/contracts";
import { DealStatus, Role } from "@dealpme/domain";
import { CurrentPrincipal, Roles, type Principal } from "../../platform/auth.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { validate } from "../../platform/zod.pipe.js";
import { DealService } from "./deal.service.js";

const TransitionSchema = z.object({
  to: z.enum(Object.values(DealStatus) as [DealStatus, ...DealStatus[]]),
  reason: z.string().max(2000).optional(),
});
const InterestSchema = z.object({ message: z.string().max(2000).nullable().default(null) });

@Controller("deals")
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.SELLER, Role.ADVISOR)
  create(@Body(validate(CreateDealRequestSchema)) body: CreateDealRequest, @CurrentPrincipal() seller: Principal, @Req() req: Request) {
    return this.dealService.create(body, seller, correlationIdOf(req));
  }

  @Post(":dealId/transitions")
  @HttpCode(200)
  @Roles(Role.SELLER, Role.ADVISOR, Role.COMPLIANCE_OPERATOR)
  async transition(@Param("dealId", validate(IdSchema)) dealId: string, @Body(validate(TransitionSchema)) body: z.infer<typeof TransitionSchema>, @CurrentPrincipal() actor: Principal, @Req() req: Request) {
    await this.dealService.changeStatus(dealId, body.to, actor, correlationIdOf(req), body.reason);
    return { status: body.to };
  }

  @Post(":dealId/interests")
  @HttpCode(201)
  @Roles(Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.ADVISOR)
  interest(@Param("dealId", validate(IdSchema)) dealId: string, @Body(validate(InterestSchema)) body: z.infer<typeof InterestSchema>, @CurrentPrincipal() investor: Principal, @Req() req: Request) {
    return this.dealService.expressInterest(dealId, investor, body.message, correlationIdOf(req));
  }
}
