import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt, inArray } from "drizzle-orm";
import { DealPmeError, ErrorCode, type CreateDealRequest, type DealTeaserT0, type SearchDealsQuery } from "@dealpme/contracts";
import { DealStatus, DealType, DisclosureTier, newId } from "@dealpme/domain";
import { projectForTier, transition } from "@dealpme/rules";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { certifications, dealEvents, deals, interests } from "../../database/schema/core.js";
import { withTenant } from "../../database/tenant.js";
import { AuditService } from "../../platform/audit.service.js";
import type { Principal } from "../../platform/auth.js";
import { FeatureFlags } from "../../platform/feature-flags.js";
import { FieldCrypto } from "../../platform/field-crypto.service.js";

const LISTED_STATUSES = [DealStatus.LISTED_OPEN, DealStatus.LISTED_RESTRICTED, DealStatus.ENGAGED, DealStatus.DUE_DILIGENCE, DealStatus.NEGOTIATION] as const;

/**
 * Toutes les lectures et écritures liées à un deal passent par withTenant : le rôle applicatif
 * ne voit que ce que les politiques RLS autorisent pour l'organisation et les rôles du principal.
 * Le code ne réécrit jamais ces filtres à la main ; il projette seulement par palier (T0/T1/T2).
 */
@Injectable()
export class DealService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly audit: AuditService,
    private readonly flags: FeatureFlags,
    private readonly crypto: FieldCrypto,
  ) {}

  /** Création du dossier : le type de cession est fixé à l'étape 1 et ne changera jamais (DP-MKT-010, trigger en base). */
  async create(req: CreateDealRequest, seller: Principal, correlationId: string): Promise<{ dealId: string }> {
    const id = newId();
    await withTenant(this.db, seller, async (tx) => {
      await tx.insert(deals).values({
        id,
        companyId: req.companyId,
        sellerOrganisationId: seller.organisationId,
        dealType: req.dealType,
        sectorCode: req.sectorCode,
        regionCode: req.regionCode,
        turnoverBand: req.turnoverBand,
      });
      await tx.insert(dealEvents).values({ id: newId(), dealId: id, fromStatus: null, toStatus: DealStatus.DRAFT, actorUserId: seller.userId, reason: "Création du dossier" });
    });
    this.audit.record({ action: "DEAL_CREATED", actorUserId: seller.userId, subjectType: "deal", subjectId: id, outcome: "OK", correlationId, metadata: { dealType: req.dealType } });
    return { dealId: id };
  }

  /**
   * Lecture d'un dossier. Le propriétaire (et l'officier CCI) obtient le dossier complet ; tout autre
   * compte n'obtient que la projection T0 d'un dossier publié. Un dossier invisible par RLS renvoie NOT_FOUND :
   * confirmer son existence serait déjà une fuite.
   */
  async getById(dealId: string, principal: Principal) {
    return withTenant(this.db, principal, async (tx) => {
      const deal = (await tx.select().from(deals).where(eq(deals.id, dealId)).limit(1))[0];
      if (!deal) throw new DealPmeError(ErrorCode.NOT_FOUND, "Dossier introuvable");
      const isOwner = deal.sellerOrganisationId === principal.organisationId;
      const isOfficer = principal.roles.includes("CCI_OFFICER") || principal.roles.includes("PLATFORM_ADMIN");
      const isDealReady = await this.isDealReady(tx, deal.companyId);
      const { askingPriceEnc, valuationBasisEnc, ...rest } = deal;
      const full = { ...rest, isDealReady, disclosureTier: isOwner || isOfficer ? DisclosureTier.T2 : DisclosureTier.T0 };
      if (isOwner || isOfficer) {
        // Déchiffrement uniquement pour le propriétaire ou l'institution : la valeur en clair ne quitte le serveur qu'ici.
        return { ...full, askingPriceXof: this.crypto.decryptInt(askingPriceEnc), valuationBasis: this.crypto.decrypt(valuationBasisEnc) };
      }
      return projectForTier(full, DisclosureTier.T0);
    });
  }

  /**
   * Transition d'état avec la machine à états de @dealpme/rules. Une transition invalide renvoie INVALID_TRANSITION (409).
   * Toute publication d'une cession de titres passe par le RPS ; en V1 le drapeau SHARE_DEAL_LISTING est fermé :
   * la tentative est bloquée et journalisée (c'est le scénario de la démonstration du blocage).
   */
  async changeStatus(dealId: string, to: DealStatus, actor: Principal, correlationId: string, reason?: string): Promise<void> {
    await withTenant(this.db, actor, async (tx) => {
      const deal = (await tx.select().from(deals).where(eq(deals.id, dealId)).limit(1))[0];
      if (!deal) throw new DealPmeError(ErrorCode.NOT_FOUND, "Dossier introuvable");
      if (deal.sellerOrganisationId !== actor.organisationId && !actor.roles.includes("COMPLIANCE_OPERATOR")) {
        throw new DealPmeError(ErrorCode.FORBIDDEN, "Seul le cédant ou la conformité peut faire évoluer ce dossier");
      }

      if (deal.dealType === DealType.SHARE_DEAL && (to === DealStatus.LISTED_OPEN || to === DealStatus.LISTED_RESTRICTED)) {
        if (!this.flags.isEnabled("SHARE_DEAL_LISTING")) {
          this.audit.record({ action: "DEAL_PUBLICATION_BLOCKED", actorUserId: actor.userId, subjectType: "deal", subjectId: dealId, outcome: "BLOCKED", correlationId, metadata: { attempted: to } });
          throw new DealPmeError(ErrorCode.PERIMETER_BLOCKED, "Publication bloquée par le périmètre réglementaire : une cession de titres ne peut pas être diffusée au-delà d'un cercle restreint autorisé par le RPS.", {
            dealType: deal.dealType,
            maxTierWithoutAdmission: DisclosureTier.T0,
            nextStep: "Admission humaine par le service de conformité (V2)",
          });
        }
      }

      const result = transition(deal.status, to, {
        dealType: deal.dealType,
        rpsPublicationAuthorized: false, // V2 : réponse du service RPS
        licensedPartnerHandoffEnabled: this.flags.isEnabled("LICENSED_PARTNER_HANDOFF"),
      });
      if (!result.ok) {
        throw new DealPmeError(ErrorCode.INVALID_TRANSITION, result.reason, { from: deal.status, to });
      }
      await tx.update(deals).set({ status: to, visibility: to === DealStatus.LISTED_OPEN ? "OPEN" : deal.visibility }).where(eq(deals.id, dealId));
      await tx.insert(dealEvents).values({ id: newId(), dealId, fromStatus: deal.status, toStatus: to, actorUserId: actor.userId, reason: reason ?? null });
      // result.createsFeeEvent : la création du FeeEvent (PENDING ou SUSPENDED) arrive avec le module finance (V3).
      this.audit.record({ action: "DEAL_TRANSITION", actorUserId: actor.userId, subjectType: "deal", subjectId: dealId, outcome: "OK", correlationId, metadata: { from: deal.status, to } });
    });
  }

  /** Recherche : uniquement des champs T0, pagination par curseur (id UUIDv7 ordonnable), jamais par offset. Contexte visiteur : seules les lignes publiées sont visibles. */
  async searchT0(q: SearchDealsQuery, principal: Principal | null): Promise<{ items: DealTeaserT0[]; nextCursor: string | null }> {
    return withTenant(this.db, principal, async (tx) => {
      const conditions = [inArray(deals.status, [...LISTED_STATUSES])];
      if (q.sectorCode) conditions.push(eq(deals.sectorCode, q.sectorCode));
      if (q.regionCode) conditions.push(eq(deals.regionCode, q.regionCode));
      if (q.turnoverBand) conditions.push(eq(deals.turnoverBand, q.turnoverBand));
      if (q.cursor) conditions.push(gt(deals.id, q.cursor));

      const rows = await tx.select().from(deals).where(and(...conditions)).orderBy(deals.id).limit(q.limit + 1);
      const page = rows.slice(0, q.limit);
      const companyIds = page.map((r) => r.companyId);
      const certRows = companyIds.length
        ? await tx.select({ companyId: certifications.companyId, decision: certifications.decision, expiresAt: certifications.expiresAt }).from(certifications).where(inArray(certifications.companyId, companyIds))
        : [];
      const ready = new Set(certRows.filter((c) => c.decision === "GRANTED" && (!c.expiresAt || c.expiresAt.getTime() > Date.now())).map((c) => c.companyId));

      const items = page
        .map((r) =>
          projectForTier(
            { id: r.id, dealType: r.dealType, sectorCode: r.sectorCode, regionCode: r.regionCode, turnoverBand: r.turnoverBand, isDealReady: ready.has(r.companyId), disclosureTier: DisclosureTier.T0 },
            DisclosureTier.T0,
          ) as DealTeaserT0,
        )
        .filter((t) => !q.dealReadyOnly || t.isDealReady);

      return { items, nextCursor: rows.length > q.limit ? (page[page.length - 1]?.id ?? null) : null };
    });
  }

  /** Manifestation d'intérêt (P09) : tracée, sans pièce jointe avant NDA. */
  async expressInterest(dealId: string, investor: Principal, message: string | null, correlationId: string): Promise<{ interestId: string }> {
    const id = newId();
    await withTenant(this.db, investor, async (tx) => {
      const deal = (await tx.select({ id: deals.id, status: deals.status }).from(deals).where(eq(deals.id, dealId)).limit(1))[0];
      if (!deal || !(LISTED_STATUSES as readonly string[]).includes(deal.status)) {
        throw new DealPmeError(ErrorCode.NOT_FOUND, "Opportunité introuvable");
      }
      await tx.insert(interests).values({ id, dealId, investorUserId: investor.userId, message });
    });
    this.audit.record({ action: "INTEREST_EXPRESSED", actorUserId: investor.userId, subjectType: "deal", subjectId: dealId, outcome: "OK", correlationId });
    return { interestId: id };
  }

  private async isDealReady(tx: Parameters<Parameters<typeof withTenant>[2]>[0], companyId: string): Promise<boolean> {
    const rows = await tx.select({ decision: certifications.decision, expiresAt: certifications.expiresAt }).from(certifications).where(eq(certifications.companyId, companyId));
    return rows.some((c) => c.decision === "GRANTED" && (!c.expiresAt || c.expiresAt.getTime() > Date.now()));
  }
}
