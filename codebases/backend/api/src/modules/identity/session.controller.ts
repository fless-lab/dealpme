import { Controller, Delete, Get, HttpCode, Inject, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { desc, eq, isNull, and } from "drizzle-orm";
import { IdSchema } from "@dealpme/contracts";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { sessions } from "../../database/schema/core.js";
import { AuditService } from "../../platform/audit.service.js";
import { CurrentPrincipal, type Principal } from "../../platform/auth.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { validate } from "../../platform/zod.pipe.js";
import { SessionService } from "./session.service.js";

/** Appareils connectés et révocation à distance (DP-IDN) ; déconnexion. Réservé au titulaire du compte. */
@Controller("auth/sessions")
export class SessionController {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly sessionService: SessionService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@CurrentPrincipal() principal: Principal) {
    const rows = await this.db
      .select({ id: sessions.id, deviceLabel: sessions.deviceLabel, lastSeenAt: sessions.lastSeenAt, createdAt: sessions.createdAt, expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(and(eq(sessions.userId, principal.userId), isNull(sessions.revokedAt)))
      .orderBy(desc(sessions.lastSeenAt));
    return { items: rows.map((r) => ({ ...r, current: r.id === principal.sessionId })) };
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@CurrentPrincipal() principal: Principal, @Req() req: Request): Promise<void> {
    await this.sessionService.revoke(principal.sessionId);
    this.audit.record({ action: "SESSION_REVOKED", actorUserId: principal.userId, subjectType: "session", subjectId: principal.sessionId, outcome: "OK", correlationId: correlationIdOf(req) });
  }

  @Delete(":sessionId")
  @HttpCode(204)
  async revoke(@Param("sessionId", validate(IdSchema)) sessionId: string, @CurrentPrincipal() principal: Principal, @Req() req: Request): Promise<void> {
    // Un compte ne révoque que ses propres sessions : la ligne d'autrui est invisible, donc sans effet.
    const own = (await this.db.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, principal.userId))).limit(1))[0];
    if (own) {
      await this.sessionService.revoke(sessionId);
      this.audit.record({ action: "SESSION_REVOKED", actorUserId: principal.userId, subjectType: "session", subjectId: sessionId, outcome: "OK", correlationId: correlationIdOf(req) });
    }
  }

  @Post("revoke-all")
  @HttpCode(204)
  async revokeAll(@CurrentPrincipal() principal: Principal, @Req() req: Request): Promise<void> {
    await this.sessionService.revokeAllForUser(principal.userId);
    this.audit.record({ action: "SESSION_REVOKED", actorUserId: principal.userId, subjectType: "user", subjectId: principal.userId, outcome: "OK", correlationId: correlationIdOf(req), metadata: { all: true } });
  }
}
