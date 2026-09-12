import { Body, Controller, Get, Header, HttpCode, Inject, Param, Post, Req } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import type { Redis } from "ioredis";
import type { Request } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { createSamlIdentityProvider, FederationError, type PreparedSamlRequest } from "@dealpme/federation";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { Role } from "@dealpme/domain";
import { loadEnv } from "../../config/env.js";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { users, sessions } from "../../database/schema/core.js";
import { withTenant } from "../../database/tenant.js";
import { REDIS } from "../../platform/redis.js";
import { RateLimitService } from "../../platform/rate-limit.service.js";
import { AuditService } from "../../platform/audit.service.js";
import { CurrentPrincipal, Roles, type Principal } from "../../platform/auth.js";
import { validate } from "../../platform/zod.pipe.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";

const ChallengeSchema = z.object({ samlRequest: z.string().min(1).max(88000), binding: z.enum(["redirect", "post"]), relayState: z.string().max(80).default("") }).strict();
const ChallengeId = z.string().regex(/^[a-f0-9]{64}$/);
const SSO_ROLES: Role[] = [Role.SELLER, Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.ADVISOR, Role.BANK, Role.CCI_OFFICER, Role.PLATFORM_ADMIN];

@Controller("federation/remo")
export class RemoSsoController {
  private readonly federation: ReturnType<typeof createSamlIdentityProvider> | null;
  constructor(@Inject(CORE_DB) private readonly db: CoreDb, @Inject(REDIS) private readonly redis: Redis, private readonly rates: RateLimitService, private readonly audit: AuditService) {
    const env = loadEnv();
    this.federation = env.REMO_SSO_ENABLED ? createSamlIdentityProvider({
      idpEntityId: env.REMO_SAML_IDP_ENTITY_ID!, ssoUrl: env.REMO_SAML_SSO_URL!, spEntityId: env.REMO_SAML_SP_ENTITY_ID!, acsUrl: env.REMO_SAML_ACS_URL!,
      privateKey: readFileSync(env.REMO_SAML_KEY_FILE!, "utf8"), certificate: readFileSync(env.REMO_SAML_CERT_FILE!, "utf8"),
      ...(env.REMO_SAML_PREVIOUS_CERT_FILE ? { previousCertificate: readFileSync(env.REMO_SAML_PREVIOUS_CERT_FILE, "utf8") } : {}),
    }) : null;
  }
  private enabled() { if (!this.federation) throw new DealPmeError(ErrorCode.NOT_FOUND, "SSO Remo non activé"); return this.federation; }

  @Get("metadata")
  @Header("Content-Type", "application/samlmetadata+xml; charset=utf-8")
  @Header("Cache-Control", "no-store")
  metadata() {
    try { return this.enabled().metadata(); }
    catch (error) { if (error instanceof FederationError && error.code === "CERTIFICATE_EXPIRED") throw new DealPmeError(ErrorCode.INTERNAL, "Le certificat SSO doit être renouvelé par l'organisation"); throw error; }
  }

  @Post("challenges")
  @HttpCode(201)
  async challenge(@Body(validate(ChallengeSchema)) body: z.infer<typeof ChallengeSchema>, @Req() req: Request) {
    const federation = this.enabled();
    await this.rates.hit("saml-prepare", req.ip ?? "unknown", { limit: 60, windowSeconds: 60 });
    let prepared: PreparedSamlRequest;
    try { prepared = await federation.prepare(body.samlRequest, body.binding, body.relayState); }
    catch (error) { if (error instanceof FederationError && error.code === "CERTIFICATE_EXPIRED") throw new DealPmeError(ErrorCode.INTERNAL, "Le certificat SSO doit être renouvelé par l'organisation"); throw new DealPmeError(ErrorCode.VALIDATION_FAILED, "Requête SAML invalide, expirée ou destinée à un autre service"); }
    const digest = createHash("sha256").update(`${loadEnv().REMO_SAML_SP_ENTITY_ID}:${prepared.requestId}`).digest("hex");
    const fresh = await this.redis.set(`saml:seen:${digest}`, "1", "EX", 600, "NX");
    if (!fresh) throw new DealPmeError(ErrorCode.CONFLICT, "Requête SAML déjà utilisée ; recommencez depuis Remo");
    const id = randomBytes(32).toString("hex");
    await this.redis.set(`saml:challenge:${id}`, JSON.stringify(prepared), "EX", 300);
    return { challengeId: id, expiresInSeconds: 300 };
  }

  @Post("challenges/:id/complete")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @Roles(...SSO_ROLES)
  async complete(@Param("id", validate(ChallengeId)) id: string, @CurrentPrincipal() principal: Principal, @Req() req: Request) {
    const federation = this.enabled();
    await this.rates.hit("saml-complete", principal.userId, { limit: 10, windowSeconds: 60 });
    const stored = await this.redis.get(`saml:challenge:${id}`);
    if (!stored) throw new DealPmeError(ErrorCode.CONFLICT, "Demande SSO expirée ou déjà consommée");
    const prepared = JSON.parse(stored) as PreparedSamlRequest;
    return withTenant(this.db, principal, async tx => {
      const user = (await tx.select({ email: users.email, verifiedAt: users.emailVerifiedAt, roles: users.roles }).from(users).where(eq(users.id, principal.userId)).for("share").limit(1))[0];
      const session = (await tx.select({ createdAt: sessions.createdAt }).from(sessions).where(and(eq(sessions.id, principal.sessionId), eq(sessions.userId, principal.userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()))).for("share").limit(1))[0];
      if (!user?.verifiedAt || !session || !user.roles.some(role => SSO_ROLES.includes(role as Role))) throw new DealPmeError(ErrorCode.UNAUTHENTICATED, "Session ou identité vérifiée requise pour le SSO");
      let response;
      try { response = await federation.respond(prepared, { email: user.email, authenticatedAt: session.createdAt }); }
      catch (error) { if (error instanceof FederationError && error.code === "CERTIFICATE_EXPIRED") throw new DealPmeError(ErrorCode.INTERNAL, "Le certificat SSO doit être renouvelé par l'organisation"); throw new DealPmeError(ErrorCode.CONFLICT, error instanceof FederationError && error.code === "REAUTH_REQUIRED" ? "Une nouvelle connexion DealPME est requise avant de reprendre le SSO" : "Demande SAML non valide"); }
      // Consommation atomique : deux requêtes concurrentes ne reçoivent jamais deux assertions.
      if (await this.redis.getdel(`saml:challenge:${id}`) !== stored) throw new DealPmeError(ErrorCode.CONFLICT, "Demande SSO déjà consommée");
      await this.audit.record({ action: "PRIVILEGED_ACCESS_USED", actorUserId: principal.userId, subjectType: "saml", subjectId: createHash("sha256").update(prepared.requestId).digest("hex"), outcome: "OK", correlationId: correlationIdOf(req), metadata: { operation: "SAML_ASSERTION_ISSUED", sp: loadEnv().REMO_SAML_SP_ENTITY_ID! } }, tx);
      return response;
    });
  }
}
