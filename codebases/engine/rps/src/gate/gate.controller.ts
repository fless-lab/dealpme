import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { DealType, DisclosureTier } from "@dealpme/domain";
import { GateService } from "./gate.service.js";

const Uuid = z.uuid();
const CreateCircleSchema = z.object({ dealType: z.enum([DealType.ASSET_DEAL, DealType.SHARE_DEAL]), legalForm: z.string().nullable().default(null), cap: z.number().int().positive().default(50) });
const PublicationSchema = z.object({
  dealType: z.enum([DealType.ASSET_DEAL, DealType.SHARE_DEAL]),
  requestedTier: z.enum([DisclosureTier.T0, DisclosureTier.T1, DisclosureTier.T2]),
  audience: z.enum(["OPEN_SURFACE", "AUTHENTICATED", "ADMITTED_CIRCLE", "NAMED_INVITATION"]),
});
const AdmitSchema = z.object({ personId: Uuid, decidedBy: Uuid, justification: z.string().min(10), relatedPersonGroupId: Uuid.nullable().default(null) });
const RevokeSchema = z.object({ personId: Uuid, decidedBy: Uuid, justification: z.string().min(10) });
const CommunicationSchema = z.object({ dealType: z.enum([DealType.ASSET_DEAL, DealType.SHARE_DEAL]), recipientTier: z.enum([DisclosureTier.T0, DisclosureTier.T1, DisclosureTier.T2]), containsSensitiveTerms: z.boolean() });

/**
 * API interne du RPS, appelée par l'API plateforme (réseau privé, jamais exposée au public).
 * Toute décision, permise ou bloquée, est inscrite au journal réglementaire.
 */
@Controller("deals/:dealId")
export class GateController {
  constructor(private readonly gate: GateService) {}

  @Post("circle")
  @HttpCode(201)
  async createCircle(@Param("dealId") dealId: string, @Body() body: unknown) {
    const b = CreateCircleSchema.parse(body);
    await this.gate.ensureCircle(Uuid.parse(dealId), b.dealType, b.legalForm, b.cap);
    return this.gate.status(dealId);
  }

  @Get("circle")
  status(@Param("dealId") dealId: string) {
    return this.gate.status(Uuid.parse(dealId));
  }

  @Post("publication-check")
  @HttpCode(200)
  publication(@Param("dealId") dealId: string, @Body() body: unknown) {
    return this.gate.checkPublication(Uuid.parse(dealId), PublicationSchema.parse(body));
  }

  @Post("admissions")
  @HttpCode(201)
  admit(@Param("dealId") dealId: string, @Body() body: unknown) {
    const b = AdmitSchema.parse(body);
    return this.gate.admit(Uuid.parse(dealId), b.personId, b.decidedBy, b.justification, b.relatedPersonGroupId);
  }

  @Post("revocations")
  @HttpCode(200)
  async revoke(@Param("dealId") dealId: string, @Body() body: unknown) {
    const b = RevokeSchema.parse(body);
    await this.gate.revoke(Uuid.parse(dealId), b.personId, b.decidedBy, b.justification);
    return this.gate.status(dealId);
  }

  @Post("communication-check")
  @HttpCode(200)
  communication(@Param("dealId") dealId: string, @Body() body: unknown) {
    const b = CommunicationSchema.parse(body);
    return this.gate.checkCommunication(Uuid.parse(dealId), b.dealType, b.recipientTier, b.containsSensitiveTerms);
  }
}
