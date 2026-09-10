import { Controller, Get, Param } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { IdSchema } from "@dealpme/contracts";
import { Role } from "@dealpme/domain";
import { CurrentPrincipal, Roles, type Principal } from "../../platform/auth.js";
import { validate } from "../../platform/zod.pipe.js";
import { DemonstrationService } from "./demonstration.service.js";

/**
 * Surface de démonstration du blocage RPS (V1). Réservée aux comptes qui présentent : cédant du dossier,
 * officier CCI-Togo, conformité, administration. Elle ne crée aucune donnée et ne simule aucun refus :
 * la tentative de publication passe par l'endpoint réel et reçoit le vrai PERIMETER_BLOCKED.
 */
@Controller("demonstration/rps")
@Roles(Role.SELLER, Role.ADVISOR, Role.CCI_OFFICER, Role.COMPLIANCE_OPERATOR, Role.PLATFORM_ADMIN)
export class DemonstrationController {
  constructor(private readonly demonstration: DemonstrationService) {}

  @Get()
  scenario(@CurrentPrincipal() principal: Principal) {
    return this.demonstration.scenario(principal);
  }

  @Get(":dealId/journal")
  journal(@Param("dealId", validate(IdSchema)) dealId: string, @CurrentPrincipal() principal: Principal) {
    return this.demonstration.journal(dealId, principal);
  }
}

@Module({
  controllers: [DemonstrationController],
  providers: [DemonstrationService],
})
export class DemonstrationModule {}
