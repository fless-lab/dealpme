import { Body, Controller, Headers, HttpCode, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { LoginRequestSchema, RegisterRequestSchema, type RegisterRequest } from "@dealpme/contracts";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { validate } from "../../platform/zod.pipe.js";
import { IdentityService } from "./identity.service.js";

@Controller("auth")
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post("register")
  @HttpCode(201)
  register(@Body(validate(RegisterRequestSchema)) body: RegisterRequest, @Req() req: Request) {
    return this.identity.register(body, correlationIdOf(req));
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body(validate(LoginRequestSchema)) body: { email: string; password: string }, @Req() req: Request, @Headers("user-agent") ua?: string) {
    const session = await this.identity.login(body.email, body.password, ua ?? null, correlationIdOf(req));
    // Le jeton est transmis au client, seul son hash est conservé côté serveur.
    return { token: session.token, expiresAt: session.expiresAt.toISOString() };
  }
}
