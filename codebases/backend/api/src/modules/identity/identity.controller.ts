import { Body, Controller, Headers, HttpCode, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { LoginRequestSchema, OtpVerifyRequestSchema, RegisterRequestSchema, type RegisterRequest } from "@dealpme/contracts";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { validate } from "../../platform/zod.pipe.js";
import { IdentityService } from "./identity.service.js";

/** IP du client : derrière un proxy de confiance (trust proxy en production), Express la lit depuis X-Forwarded-For. */
function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "0.0.0.0";
}

type OtpBody = { challengeId: string; code: string };

@Controller("auth")
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post("register")
  @HttpCode(201)
  register(@Body(validate(RegisterRequestSchema)) body: RegisterRequest, @Req() req: Request) {
    return this.identity.register(body, clientIp(req), correlationIdOf(req));
  }

  /** Vérification de l'email avec le code reçu : condition de première connexion. */
  @Post("email/verify")
  @HttpCode(200)
  async verifyEmail(@Body(validate(OtpVerifyRequestSchema)) body: OtpBody, @Req() req: Request) {
    await this.identity.verifyEmail(body.challengeId, body.code, correlationIdOf(req));
    return { verified: true };
  }

  /** Connexion : renvoie soit une session, soit un défi de second facteur (rôles CCI-Togo, conformité, administration). */
  @Post("login")
  @HttpCode(200)
  async login(@Body(validate(LoginRequestSchema)) body: { email: string; password: string }, @Req() req: Request, @Headers("user-agent") ua?: string) {
    const outcome = await this.identity.login(body.email, body.password, clientIp(req), ua?.slice(0, 120) ?? null, correlationIdOf(req));
    if (outcome.kind === "MFA_REQUIRED") {
      return { mfaRequired: true, challengeId: outcome.challengeId, ...(outcome.devCode ? { devCode: outcome.devCode } : {}) };
    }
    // Le jeton est transmis au client, seul son hash est conservé côté serveur.
    return { token: outcome.token, expiresAt: outcome.expiresAt.toISOString() };
  }

  @Post("mfa/verify")
  @HttpCode(200)
  async mfa(@Body(validate(OtpVerifyRequestSchema)) body: OtpBody, @Req() req: Request, @Headers("user-agent") ua?: string) {
    const session = await this.identity.completeMfa(body.challengeId, body.code, clientIp(req), ua?.slice(0, 120) ?? null, correlationIdOf(req));
    return { token: session.token, expiresAt: session.expiresAt.toISOString() };
  }
}
