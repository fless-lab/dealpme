import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { IdSchema, SendMessageSchema, MessageQuerySchema } from "@dealpme/contracts";
import { RegionCode, Role, TurnoverBand } from "@dealpme/domain";
import { CurrentPrincipal, OptionalPrincipal, Roles, type Principal } from "../../platform/auth.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { validate } from "../../platform/zod.pipe.js";
import { MarketplaceService } from "./marketplace.service.js";

const AlertSchema = z.object({
  label: z.string().min(2).max(120),
  sectorCode: z.string().max(16).nullable().default(null),
  regionCode: z.enum(Object.values(RegionCode) as [string, ...string[]]).nullable().default(null),
  turnoverBand: z.enum(Object.values(TurnoverBand) as [string, ...string[]]).nullable().default(null),
  dealReadyOnly: z.boolean().default(false),
  /** Jamais vrai par défaut : le consentement est un acte, pas une case pré-cochée. */
  notifyOptIn: z.boolean().default(false),
});
const OptInSchema = z.object({ notifyOptIn: z.boolean() });

/** Place de marché (P09) : fiche T0, mise en relation, alertes enregistrées, tableau de bord du cédant. */
@Controller()
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  /** Fiche publique d'une opportunité publiée : palier T0 uniquement, y compris pour un visiteur. */
  @Get("opportunities/:dealId")
  teaser(@Param("dealId", validate(IdSchema)) dealId: string, @OptionalPrincipal() principal: Principal | null) {
    return this.marketplace.teaser(dealId, principal);
  }

  @Post("deals/:dealId/messages")
  @HttpCode(201)
  @Roles(Role.SELLER, Role.ADVISOR, Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.BANK)
  send(
    @Param("dealId", validate(IdSchema)) dealId: string,
    @Body(validate(SendMessageSchema)) body: z.infer<typeof SendMessageSchema>,
    @CurrentPrincipal() sender: Principal,
    @Req() req: Request,
  ) {
    return this.marketplace.sendMessage(dealId, body.body, sender, correlationIdOf(req), body.conversationId);
  }

  @Get("deals/:dealId/messages")
  @Roles(Role.SELLER, Role.ADVISOR, Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.BANK)
  thread(@Param("dealId", validate(IdSchema)) dealId: string, @CurrentPrincipal() principal: Principal, @Query(validate(MessageQuerySchema)) query: z.infer<typeof MessageQuerySchema>) {
    return this.marketplace.messages(dealId, principal, query);
  }

  @Get("deals/:dealId/conversations")
  @Roles(Role.SELLER, Role.ADVISOR)
  conversations(@Param("dealId", validate(IdSchema)) dealId: string, @CurrentPrincipal() principal: Principal) {
    return this.marketplace.conversations(dealId, principal);
  }

  @Get("deals/:dealId/interests")
  @Roles(Role.SELLER, Role.ADVISOR)
  received(@Param("dealId", validate(IdSchema)) dealId: string, @CurrentPrincipal() seller: Principal) {
    return this.marketplace.interestsFor(dealId, seller);
  }

  @Get("seller/dashboard")
  @Roles(Role.SELLER, Role.ADVISOR)
  dashboard(@CurrentPrincipal() seller: Principal) {
    return this.marketplace.sellerDashboard(seller);
  }

  @Get("interests")
  @Roles(Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.BANK, Role.ADVISOR)
  myInterests(@CurrentPrincipal() principal: Principal) {
    return this.marketplace.myInterests(principal);
  }

  @Get("alerts")
  @Roles(Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.BANK, Role.ADVISOR)
  alerts(@CurrentPrincipal() principal: Principal) {
    return this.marketplace.listAlerts(principal);
  }

  @Post("alerts")
  @HttpCode(201)
  @Roles(Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.BANK, Role.ADVISOR)
  createAlert(@Body(validate(AlertSchema)) body: z.infer<typeof AlertSchema>, @CurrentPrincipal() principal: Principal, @Req() req: Request) {
    return this.marketplace.createAlert(body, principal, correlationIdOf(req));
  }

  @Post("alerts/:alertId/opt-in")
  @HttpCode(200)
  @Roles(Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.BANK, Role.ADVISOR)
  async optIn(
    @Param("alertId", validate(IdSchema)) alertId: string,
    @Body(validate(OptInSchema)) body: z.infer<typeof OptInSchema>,
    @CurrentPrincipal() principal: Principal,
    @Req() req: Request,
  ) {
    await this.marketplace.setAlertOptIn(alertId, body.notifyOptIn, principal, correlationIdOf(req));
    return { notifyOptIn: body.notifyOptIn };
  }

  @Delete("alerts/:alertId")
  @HttpCode(204)
  @Roles(Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.BANK, Role.ADVISOR)
  async removeAlert(@Param("alertId", validate(IdSchema)) alertId: string, @CurrentPrincipal() principal: Principal, @Req() req: Request): Promise<void> {
    await this.marketplace.deleteAlert(alertId, principal, correlationIdOf(req));
  }
}
