import { Body, Controller, HttpCode, Inject, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { LegalForm, Role, newId } from "@dealpme/domain";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { companies } from "../../database/schema/core.js";
import { withTenant } from "../../database/tenant.js";
import { AuditService } from "../../platform/audit.service.js";
import { CurrentPrincipal, Roles, type Principal } from "../../platform/auth.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { validate } from "../../platform/zod.pipe.js";

const CreateCompanySchema = z.object({
  legalName: z.string().min(2).max(200),
  legalForm: z.enum(Object.values(LegalForm) as [LegalForm, ...LegalForm[]]),
  rccmNumber: z.string().min(3).max(64).optional(),
});

/** Entreprise cible d'une transmission : données déclarées par le cédant, vérifiées séparément par la CCI-Togo (P04). */
@Controller("companies")
export class CompanyController {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @HttpCode(201)
  @Roles(Role.SELLER, Role.ADVISOR)
  async create(@Body(validate(CreateCompanySchema)) body: z.infer<typeof CreateCompanySchema>, @CurrentPrincipal() seller: Principal, @Req() req: Request) {
    const id = newId();
    await withTenant(this.db, seller, async (tx) => {
      await tx.insert(companies).values({ id, ownerOrganisationId: seller.organisationId, legalName: body.legalName, legalForm: body.legalForm, rccmNumber: body.rccmNumber ?? null });
      await this.audit.record({ action: "DEAL_CREATED", actorUserId: seller.userId, subjectType: "company", subjectId: id, outcome: "OK", correlationId: correlationIdOf(req) }, tx);
    });
    return { companyId: id };
  }
}
