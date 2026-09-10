import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray } from "drizzle-orm";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { DealType, DisclosureTier } from "@dealpme/domain";
import { maxTierWithoutAdmission, projectForTier } from "@dealpme/rules";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { auditEvents, companies, dealEvents, deals, shareDealDetails, users } from "../../database/schema/core.js";
import { withTenant } from "../../database/tenant.js";
import type { Principal } from "../../platform/auth.js";
import { FeatureFlags } from "../../platform/feature-flags.js";

const DEMO_ACTIONS = ["DEAL_CREATED", "DEAL_TRANSITION", "DEAL_PUBLICATION_BLOCKED", "CERTIFICATION_DECIDED", "REGISTRY_VERIFIED"] as const;

/**
 * Scénario de démonstration du blocage réglementaire (V1). Il ne simule rien : il lit le dossier de titres
 * du jeu de démonstration, présente ce qu'un tiers non admis peut légitimement voir, et laisse la tentative
 * de publication se heurter au vrai refus du serveur. Le journal affiché est le journal d'audit réel.
 *
 * Tout ce que cette surface renvoie porte l'étiquette de démonstration : aucune donnée n'y est réelle.
 */
@Injectable()
export class DemonstrationService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly flags: FeatureFlags,
  ) {}

  /**
   * État du scénario : le dossier de titres étiqueté démonstration, sa projection au palier maximal
   * autorisé sans admission, et ce que le palier suivant contiendrait si une admission était prononcée.
   */
  async scenario(principal: Principal) {
    const deal = await withTenant(this.db, principal, async (tx) => {
      const rows = await tx
        .select({
          id: deals.id,
          companyId: deals.companyId,
          dealType: deals.dealType,
          status: deals.status,
          visibility: deals.visibility,
          sectorCode: deals.sectorCode,
          regionCode: deals.regionCode,
          turnoverBand: deals.turnoverBand,
          disclosureCount: deals.disclosureCount,
          circleCap: deals.circleCap,
          createdAt: deals.createdAt,
        })
        .from(deals)
        .where(eq(deals.dealType, DealType.SHARE_DEAL))
        .orderBy(deals.createdAt)
        .limit(1);
      return rows[0];
    });
    if (!deal) {
      throw new DealPmeError(ErrorCode.NOT_FOUND, "Aucun dossier de cession de titres dans le jeu de démonstration. Chargez les données de démonstration.");
    }

    const details = (await this.db.select().from(shareDealDetails).where(eq(shareDealDetails.dealId, deal.id)).limit(1))[0];
    const maxTier = maxTierWithoutAdmission(deal.dealType as DealType);

    // Ce qu'un tiers non admis peut voir : palier T0, projeté par la même fonction que la place de marché.
    const publicView = projectForTier({ ...deal, isDealReady: false, disclosureTier: DisclosureTier.T0 }, DisclosureTier.T0);

    // Ce que verrait un membre admis au cercle : T1 anonymisé. Aucune identité, aucun prix, aucune condition.
    const circleView = projectForTier(
      {
        ...deal,
        isDealReady: false,
        disclosureTier: DisclosureTier.T1,
        anonymisedSummary: "Société industrielle du Grand Lomé, plus de quinze ans d'activité, dirigeant partant à la retraite.",
        employeesBand: "50 à 100 personnes",
        yearsInOperation: "plus de 15 ans",
        financialProfileBands: { chiffreAffaires: "plus de 1 Md FCFA", rentabilite: "positive sur les trois derniers exercices" },
        transferRestrictionsPresent: !!details?.transferRestrictionsEnc,
      },
      DisclosureTier.T1,
    );

    return {
      label: "Données de démonstration : synthétiques, jamais réelles",
      deal: { id: deal.id, status: deal.status, visibility: deal.visibility, dealType: deal.dealType, createdAt: deal.createdAt },
      circle: { disclosureCount: deal.disclosureCount, cap: deal.circleCap, admissionRequired: true },
      maxTierWithoutAdmission: maxTier,
      publicView,
      circleView,
      /** Ce qui reste fermé même au palier T1 : la liste vient de l'allow-list, pas d'un texte d'écran. */
      withheldAtT1: ["Raison sociale", "Numéro RCCM", "Prix demandé", "Base de valorisation", "Pourcentage du capital cédé", "Clauses d'agrément détaillées", "Data room"],
      shareDealListingEnabled: this.flags.isEnabled("SHARE_DEAL_LISTING"),
    };
  }

  /**
   * Journal lisible du scénario : événements du dossier et journal d'audit associé, en clair.
   * Les deux sont des tables append-only : ce que la démonstration montre ne peut pas avoir été retouché.
   */
  async journal(dealId: string, principal: Principal) {
    const events = await withTenant(this.db, principal, async (tx) =>
      tx
        .select({ id: dealEvents.id, fromStatus: dealEvents.fromStatus, toStatus: dealEvents.toStatus, reason: dealEvents.reason, occurredAt: dealEvents.occurredAt })
        .from(dealEvents)
        .where(eq(dealEvents.dealId, dealId))
        .orderBy(desc(dealEvents.occurredAt))
        .limit(50),
    );
    const audit = await this.db
      .select({
        id: auditEvents.id,
        action: auditEvents.action,
        outcome: auditEvents.outcome,
        occurredAt: auditEvents.occurredAt,
        metadata: auditEvents.metadata,
        actorEmail: users.email,
      })
      .from(auditEvents)
      .leftJoin(users, eq(users.id, auditEvents.actorUserId))
      .where(and(eq(auditEvents.subjectId, dealId), inArray(auditEvents.action, [...DEMO_ACTIONS])))
      .orderBy(desc(auditEvents.occurredAt))
      .limit(50);
    return { events, audit };
  }

  /** Nom de l'entreprise du dossier, réservé au propriétaire et à l'institution : sert au commentaire de la démonstration. */
  async companyName(dealId: string, principal: Principal): Promise<string | null> {
    return withTenant(this.db, principal, async (tx) => {
      const row = (
        await tx
          .select({ legalName: companies.legalName })
          .from(deals)
          .innerJoin(companies, eq(companies.id, deals.companyId))
          .where(eq(deals.id, dealId))
          .limit(1)
      )[0];
      return row?.legalName ?? null;
    });
  }
}
