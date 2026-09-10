import { Controller, Get, Inject } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { SubscriptionTier } from "@dealpme/domain";
import { ENTITLEMENTS, ENTITLEMENTS_VERSION } from "@dealpme/rules";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { subscriptions } from "../../database/schema/core.js";
import { CurrentPrincipal, type Principal } from "../../platform/auth.js";

/**
 * Palier d'abonnement de l'organisation et droits associés (v0, section 7.1.1).
 * Les droits ne sont jamais recopiés : ils viennent de la grille versionnée de @dealpme/rules.
 * V1 ne prend aucun paiement : le palier est posé par l'administration, l'écran l'affiche.
 */
@Controller("subscription")
export class SubscriptionController {
  constructor(@Inject(CORE_DB) private readonly db: CoreDb) {}

  @Get()
  async current(@CurrentPrincipal() principal: Principal) {
    const row = (
      await this.db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.organisationId, principal.organisationId))
        .orderBy(desc(subscriptions.periodStart))
        .limit(1)
    )[0];
    if (!row) throw new DealPmeError(ErrorCode.NOT_FOUND, "Aucun abonnement enregistré pour cette organisation");
    const tier = row.tier as SubscriptionTier;
    const expired = row.periodEnd.getTime() < Date.now();
    return {
      tier,
      paymentState: row.paymentState,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      expired,
      entitlementsVersion: row.entitlementsVersion,
      currentVersion: ENTITLEMENTS_VERSION,
      /** Les droits servis sont ceux de la version enregistrée à la souscription, pas ceux d'aujourd'hui. */
      entitlements: ENTITLEMENTS[tier],
      grid: ENTITLEMENTS,
    };
  }
}
