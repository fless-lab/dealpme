import { Body, Controller, Get, Header, HttpCode, Param, Post, Req } from "@nestjs/common";
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
import { CertificationRequestService } from "./certification-request.service.js";
import { InstitutionService } from "./institution.service.js";
import { ManualRegistryResultSchema } from "./registry-review.js";

const RemediationSchema = z.object({
  items: z
    .array(z.object({ label: z.string().min(3).max(200), detail: z.string().max(2000).nullable().default(null) }))
    .min(1)
    .max(20),
});

const ManualRegistrySchema = RegistryVerificationRequestSchema.extend({
  manualResult: ManualRegistryResultSchema.optional(),
  requestId: z.uuid().optional(),
  fallbackFromId: z.uuid().optional(),
  fallbackReason: z.string().trim().min(3).max(2000).optional(),
});

/** Espace CCI-Togo : réservé aux officiers, rôles et journal séparés du back-office plateforme. */
@Controller("institution")
@Roles(Role.CCI_OFFICER)
export class InstitutionController {
  constructor(
    private readonly institution: InstitutionService,
    private readonly requests: CertificationRequestService,
  ) {}

  // ---- lectures de la console

  @Get("overview")
  overview(@CurrentPrincipal() officer: Principal) {
    return this.institution.overview(officer);
  }

  @Get("organisations")
  organisations() {
    return this.institution.listOrganisations();
  }

  @Get("companies")
  companies(@CurrentPrincipal() officer: Principal) {
    return this.institution.listCompanies(officer);
  }

  @Get("companies/:companyId")
  company(@Param("companyId", validate(IdSchema)) companyId: string, @CurrentPrincipal() officer: Principal) {
    return this.institution.companyDetail(companyId, officer);
  }

  @Get("certifications")
  certifications(@CurrentPrincipal() officer: Principal) {
    return this.institution.listCertifications(officer);
  }

  /** File d'instruction des demandes Deal-Ready, avec la liste de contrôle de chaque entreprise. */
  @Get("certification-requests")
  queue(@CurrentPrincipal() officer: Principal) {
    return this.requests.queue(officer);
  }

  /** Remédiation : l'officier nomme les points à reprendre, la demande retourne à l'entreprise. */
  @Post("certification-requests/:requestId/remediation")
  @HttpCode(200)
  async remediation(
    @Param("requestId", validate(IdSchema)) requestId: string,
    @Body(validate(RemediationSchema)) body: z.infer<typeof RemediationSchema>,
    @CurrentPrincipal() officer: Principal,
    @Req() req: Request,
  ) {
    await this.requests.requireRemediation(requestId, body.items, officer, correlationIdOf(req));
    return { state: "REMEDIATION_REQUIRED" };
  }

  @Get("certifications.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="certifications-deal-ready.csv"')
  certificationsCsv(@CurrentPrincipal() officer: Principal) {
    return this.institution.certificationsCsv(officer);
  }

  // ---- décisions

  @Post("membership-confirmations")
  @HttpCode(201)
  async confirm(@Body(validate(MembershipConfirmationRequestSchema)) body: { organisationId: string; confirmationRef: string }, @CurrentPrincipal() officer: Principal, @Req() req: Request) {
    await this.institution.confirmMembership(body.organisationId, body.confirmationRef, officer, correlationIdOf(req));
    return { confirmed: true };
  }

  @Post("registry-verifications")
  @HttpCode(201)
  verify(@Body(validate(ManualRegistrySchema)) body: z.infer<typeof ManualRegistrySchema>, @CurrentPrincipal() officer: Principal, @Req() req: Request) {
    return this.institution.verifyRegistry(body.companyId, body.rccmNumber, officer, correlationIdOf(req), body.manualResult, body);
  }

  @Post("certifications")
  @HttpCode(201)
  decide(@Body(validate(CertificationDecisionRequestSchema)) body: CertificationDecisionRequest, @CurrentPrincipal() officer: Principal, @Req() req: Request) {
    return this.institution.decideCertification(body, officer, correlationIdOf(req));
  }

  /** Statut public du badge : lisible par tous, le texte de portée accompagne toujours le badge. */
  @Get("certifications/:companyId")
  @Roles()
  current(@Param("companyId", validate(IdSchema)) companyId: string) {
    return this.institution.currentCertification(companyId);
  }
}
