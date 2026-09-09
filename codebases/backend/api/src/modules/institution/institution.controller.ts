import { Body, Controller, Get, HttpCode, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import {
  CertificationDecisionRequestSchema,
  IdSchema,
  MembershipConfirmationRequestSchema,
  RegistryVerificationRequestSchema,
  type CertificationDecisionRequest,
} from "@dealpme/contracts";
import { Role } from "@dealpme/domain";
import { CurrentPrincipal, Roles, type Principal } from "../../platform/auth.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { validate } from "../../platform/zod.pipe.js";
import { InstitutionService } from "./institution.service.js";

const ManualRegistrySchema = RegistryVerificationRequestSchema.extend({
  manualResult: z
    .object({ legalName: z.string().min(1), legalForm: z.string().min(1), status: z.string().min(1), sourceRef: z.string().min(3) })
    .optional(),
});

/** Espace CCI-Togo : réservé aux officiers, rôles et journal séparés du back-office plateforme. */
@Controller("institution")
@Roles(Role.CCI_OFFICER)
export class InstitutionController {
  constructor(private readonly institution: InstitutionService) {}

  @Post("membership-confirmations")
  @HttpCode(201)
  async confirm(@Body(validate(MembershipConfirmationRequestSchema)) body: { organisationId: string; confirmationRef: string }, @CurrentPrincipal() officer: Principal, @Req() req: Request) {
    await this.institution.confirmMembership(body.organisationId, body.confirmationRef, officer, correlationIdOf(req));
    return { confirmed: true };
  }

  @Post("registry-verifications")
  @HttpCode(201)
  verify(@Body(validate(ManualRegistrySchema)) body: z.infer<typeof ManualRegistrySchema>, @CurrentPrincipal() officer: Principal, @Req() req: Request) {
    return this.institution.verifyRegistry(body.companyId, body.rccmNumber, officer, correlationIdOf(req), body.manualResult);
  }

  @Post("certifications")
  @HttpCode(201)
  decide(@Body(validate(CertificationDecisionRequestSchema)) body: CertificationDecisionRequest, @CurrentPrincipal() officer: Principal, @Req() req: Request) {
    return this.institution.decideCertification(body, officer, correlationIdOf(req));
  }

  @Get("certifications/:companyId")
  @Roles()
  current(@Param("companyId", validate(IdSchema)) companyId: string) {
    return this.institution.currentCertification(companyId);
  }
}
