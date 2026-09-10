import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";
import { z } from "zod";
import { DealPmeError, ErrorCode, IdSchema } from "@dealpme/contracts";
import { Role } from "@dealpme/domain";
import { loadEnv } from "../../config/env.js";
import { CurrentPrincipal, Roles, type Principal } from "../../platform/auth.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { validate } from "../../platform/zod.pipe.js";
import { DossierService, type UploadedFile as DossierFile } from "./dossier.service.js";

const DeclareFactSchema = z.object({
  fieldKey: z.string().min(2).max(64),
  periodLabel: z.string().max(16).nullable().default(null),
  valueText: z.string().max(4000).nullable().default(null),
  valueAmountXof: z.number().int().nonnegative().nullable().default(null),
  source: z.enum(["SELLER_DECLARATION", "SUPPORTING_DOCUMENT", "REGISTRY", "EXPERT_REVIEW"]).default("SELLER_DECLARATION"),
  sourceDocumentId: IdSchema.nullable().default(null),
  note: z.string().max(2000).nullable().default(null),
});
const FieldKeySchema = z.string().min(2).max(64);

/**
 * Dossier cédant (P04) : assistant de constitution, valeurs déclarées avec provenance, pièces déposées.
 * Réservé au cédant propriétaire et à ses conseils ; l'officier CCI-Togo lit pour instruire (RLS).
 */
@Controller("deals/:dealId/dossier")
export class DossierController {
  constructor(private readonly dossier: DossierService) {}

  @Get()
  @Roles(Role.SELLER, Role.ADVISOR, Role.CCI_OFFICER, Role.PLATFORM_ADMIN)
  get(@Param("dealId", validate(IdSchema)) dealId: string, @CurrentPrincipal() principal: Principal) {
    return this.dossier.getDossier(dealId, principal);
  }

  @Get("completeness")
  @Roles(Role.SELLER, Role.ADVISOR, Role.CCI_OFFICER, Role.PLATFORM_ADMIN)
  completeness(@Param("dealId", validate(IdSchema)) dealId: string, @CurrentPrincipal() principal: Principal) {
    return this.dossier.completenessOfDeal(dealId, principal);
  }

  @Post("facts")
  @HttpCode(201)
  @Roles(Role.SELLER, Role.ADVISOR)
  declare(
    @Param("dealId", validate(IdSchema)) dealId: string,
    @Body(validate(DeclareFactSchema)) body: z.infer<typeof DeclareFactSchema>,
    @CurrentPrincipal() seller: Principal,
    @Req() req: Request,
  ) {
    return this.dossier.declareFact(dealId, body, seller, correlationIdOf(req));
  }

  @Get("facts/history")
  @Roles(Role.SELLER, Role.ADVISOR, Role.CCI_OFFICER, Role.PLATFORM_ADMIN)
  history(@Param("dealId", validate(IdSchema)) dealId: string, @Query("fieldKey", validate(FieldKeySchema)) fieldKey: string, @CurrentPrincipal() principal: Principal) {
    return this.dossier.factHistory(dealId, fieldKey, principal);
  }

  /**
   * Dépôt d'une pièce. Le fichier reste en mémoire jusqu'à son verdict antivirus : rien n'est écrit
   * sur disque avant. La limite de taille est appliquée par multer et revérifiée par le service.
   */
  @Post("documents")
  @HttpCode(201)
  @Roles(Role.SELLER, Role.ADVISOR)
  @UseInterceptors(FileInterceptor("file", { storage: undefined, limits: { fileSize: loadEnv().DOSSIER_MAX_FILE_BYTES, files: 1 } }))
  async upload(
    @Param("dealId", validate(IdSchema)) dealId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: Record<string, string>,
    @CurrentPrincipal() seller: Principal,
    @Req() req: Request,
  ) {
    if (!file) throw new DealPmeError(ErrorCode.VALIDATION_FAILED, "Aucun fichier reçu");
    const category = z.string().min(2).max(48).parse(body["category"]);
    const title = z.string().min(2).max(200).parse(body["title"] ?? file.originalname);
    const payload: DossierFile = { originalName: file.originalname, mimeType: file.mimetype, buffer: file.buffer, size: file.size };
    return this.dossier.uploadDocument(dealId, { category, title, file: payload }, seller, correlationIdOf(req));
  }

  /** Lecture d'une pièce : le contenu transite par l'API, jamais par une URL de stockage. */
  @Get("documents/:documentId/content")
  @Roles(Role.SELLER, Role.ADVISOR, Role.CCI_OFFICER, Role.PLATFORM_ADMIN)
  async content(
    @Param("dealId", validate(IdSchema)) dealId: string,
    @Param("documentId", validate(IdSchema)) documentId: string,
    @CurrentPrincipal() principal: Principal,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const doc = await this.dossier.readDocument(dealId, documentId, principal, correlationIdOf(req));
    res.setHeader("Content-Type", doc.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.fileName)}"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(Buffer.from(doc.body));
  }
}
