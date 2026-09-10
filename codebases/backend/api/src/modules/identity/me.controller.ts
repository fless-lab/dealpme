import { Controller, Get, Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { organisations, users } from "../../database/schema/core.js";
import { CurrentPrincipal, type Principal } from "../../platform/auth.js";

/** Profil du compte connecté : ce que l'application web affiche dans l'en-tête et la page Compte. Aucune donnée d'un autre compte. */
@Controller("me")
export class MeController {
  constructor(@Inject(CORE_DB) private readonly db: CoreDb) {}

  @Get()
  async me(@CurrentPrincipal() principal: Principal) {
    const row = (
      await this.db
        .select({ email: users.email, phoneE164: users.phoneE164, emailVerifiedAt: users.emailVerifiedAt, roles: users.roles, organisation: organisations.name, createdAt: users.createdAt })
        .from(users)
        .innerJoin(organisations, eq(organisations.id, users.organisationId))
        .where(eq(users.id, principal.userId))
        .limit(1)
    )[0];
    return { userId: principal.userId, organisationId: principal.organisationId, ...row };
  }
}
