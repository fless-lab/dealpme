import { Body, Controller, Get, HttpCode, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { IdSchema } from "@dealpme/contracts";
import { Role } from "@dealpme/domain";
import { CurrentPrincipal, Roles, type Principal } from "../../platform/auth.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { validate } from "../../platform/zod.pipe.js";
import { CertificationRequestService } from "./certification-request.service.js";

const RequestSchema = z.object({ message: z.string().max(2000).nullable().default(null) });

/**
 * Côté entreprise : liste de contrôle Deal-Ready, dépôt et suivi de la demande de certification (P06).
 * L'entreprise voit exactement les critères que l'officier verra, avec ce qu'il reste à produire.
 */
@Controller("companies")
export class CertificationRequestController {
  constructor(private readonly requests: CertificationRequestService) {}

  @Get(":companyId/certification")
  @Roles(Role.SELLER, Role.ADVISOR, Role.CCI_OFFICER, Role.PLATFORM_ADMIN)
  view(@Param("companyId", validate(IdSchema)) companyId: string, @CurrentPrincipal() principal: Principal) {
    return this.requests.companyView(companyId, principal);
  }

  @Post(":companyId/certification-requests")
  @HttpCode(201)
  @Roles(Role.SELLER, Role.ADVISOR)
  create(
    @Param("companyId", validate(IdSchema)) companyId: string,
    @Body(validate(RequestSchema)) body: z.infer<typeof RequestSchema>,
    @CurrentPrincipal() seller: Principal,
    @Req() req: Request,
  ) {
    return this.requests.request(companyId, body.message, seller, correlationIdOf(req));
  }

  @Post(":companyId/certification-requests/:requestId/withdraw")
  @HttpCode(200)
  @Roles(Role.SELLER, Role.ADVISOR)
  async withdraw(@Param("requestId", validate(IdSchema)) requestId: string, @CurrentPrincipal() seller: Principal, @Req() req: Request) {
    await this.requests.withdraw(requestId, seller, correlationIdOf(req));
    return { state: "WITHDRAWN" };
  }
}
