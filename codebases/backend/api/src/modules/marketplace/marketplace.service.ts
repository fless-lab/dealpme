import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { DealPmeError, ErrorCode, type DealTeaserT0, type MessagePage, type SentMessage, type ConversationSummary, type MessageQuerySchema } from "@dealpme/contracts";
import type { z } from "zod";
import { DealStatus, DisclosureTier, newId } from "@dealpme/domain";
import { contactRefusalMessage, findContactDetails, projectForTier } from "@dealpme/rules";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { certifications, dealConversations, dealMessages, dealViews, deals, interests, notificationIntents, savedAlerts, users } from "../../database/schema/core.js";
import { withTenant } from "../../database/tenant.js";
import { AuditService } from "../../platform/audit.service.js";
import type { Principal } from "../../platform/auth.js";

const LISTED = [DealStatus.LISTED_OPEN, DealStatus.LISTED_RESTRICTED, DealStatus.ENGAGED, DealStatus.DUE_DILIGENCE, DealStatus.NEGOTIATION] as const;

@Injectable()
export class MarketplaceService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly audit: AuditService,
  ) {}

  /**
   * Fiche T0 publique d'une opportunité publiée. Aucun champ au-delà de T0 n'est sérialisé, et la
   * consultation est enregistrée pour le compteur du cédant. Un dossier non publié est introuvable.
   */
  async teaser(dealId: string, principal: Principal | null): Promise<DealTeaserT0 & { isDealReady: boolean; publishedAt: Date | null }> {
    return withTenant(this.db, principal, async (tx) => {
      const deal = (await tx.select().from(deals).where(eq(deals.id, dealId)).limit(1))[0];
      if (!deal || !(LISTED as readonly string[]).includes(deal.status)) throw new DealPmeError(ErrorCode.NOT_FOUND, "Opportunité introuvable");
      const certRows = await tx.select().from(certifications).where(eq(certifications.companyId, deal.companyId)).orderBy(desc(certifications.decidedAt), desc(certifications.id)).limit(1);
      const isDealReady = certRows.some((c) => c.decision === "GRANTED" && !c.registryInvalidatedAt && (!c.expiresAt || c.expiresAt.getTime() > Date.now()));
      await tx.insert(dealViews).values({
        id: newId(),
        dealId,
        viewerUserId: principal?.userId ?? null,
        viewerOrganisationId: principal?.organisationId ?? null,
      });
      const teaser = projectForTier(
        { id: deal.id, dealType: deal.dealType, sectorCode: deal.sectorCode, regionCode: deal.regionCode, turnoverBand: deal.turnoverBand, isDealReady, disclosureTier: DisclosureTier.T0 },
        DisclosureTier.T0,
      ) as DealTeaserT0;
      return { ...teaser, isDealReady, publishedAt: deal.createdAt };
    });
  }

  /**
   * Message de mise en relation. Texte seul : aucune pièce jointe n'est acceptée avant NDA, et les
   * coordonnées directes sont refusées en nommant ce qui bloque, plutôt que silencieusement caviardées.
   */
  async sendMessage(dealId: string, body: string, sender: Principal, correlationId: string, conversationId?: string): Promise<SentMessage> {
    let denial: Parameters<AuditService["rejection"]>[0] | undefined;
    try {
      return await withTenant(this.db, sender, async (tx) => {
      const deal = (await tx.select({ id: deals.id, status: deals.status, seller: deals.sellerOrganisationId }).from(deals).where(eq(deals.id, dealId)).limit(1))[0];
      if (!deal) throw new DealPmeError(ErrorCode.NOT_FOUND, "Opportunité introuvable");
      const isSeller = deal.seller === sender.organisationId;
      if (isSeller && !conversationId) throw new DealPmeError(ErrorCode.VALIDATION_FAILED, "Choisissez la conversation du repreneur destinataire");
      const conversation = (await tx.select().from(dealConversations).where(and(
        eq(dealConversations.dealId, dealId),
        conversationId ? eq(dealConversations.id, conversationId) : eq(dealConversations.investorOrganisationId, sender.organisationId),
        or(eq(dealConversations.sellerOrganisationId, sender.organisationId), eq(dealConversations.investorOrganisationId, sender.organisationId)),
      )).limit(1))[0];
      if (!conversation) throw new DealPmeError(ErrorCode.NOT_FOUND, "Conversation introuvable ; manifestez votre intérêt avant d'écrire");
      const found = findContactDetails(body);
      if (found) {
        denial = { action: "MESSAGE_BLOCKED", actorUserId: sender.userId, subjectType: "deal", subjectId: dealId, outcome: "BLOCKED", correlationId, metadata: { reason: found.kind, conversationId: conversation.id } };
        throw new DealPmeError(ErrorCode.VALIDATION_FAILED, contactRefusalMessage(found), { reason: "CONTACT_DETAILS_BLOCKED", detected: found.reason });
      }
      const id = newId();
      const createdAt = new Date();
      await tx.insert(dealMessages).values({ id, dealId, conversationId: conversation.id, senderUserId: sender.userId, senderOrganisationId: sender.organisationId, body, createdAt });
      await this.audit.record({ action: "MESSAGE_SENT", actorUserId: sender.userId, subjectType: "deal", subjectId: dealId, outcome: "OK", correlationId, metadata: { messageId: id, conversationId: conversation.id } }, tx);
      return { messageId: id, conversationId: conversation.id, message: { id, conversationId: conversation.id, body, createdAt: createdAt.toISOString(), mine: true } };
      });
    } catch (error) {
      if (denial) await this.audit.rejection(denial);
      throw error;
    }
  }

  /** Sélecteur du cédant : références opaques, jamais l'identité du repreneur en T0. */
  async conversations(dealId: string, principal: Principal): Promise<{ items: ConversationSummary[] }> {
    return withTenant(this.db, principal, async (tx) => {
      const deal = (await tx.select({ seller: deals.sellerOrganisationId }).from(deals).where(eq(deals.id, dealId)).limit(1))[0];
      if (!deal || deal.seller !== principal.organisationId) throw new DealPmeError(ErrorCode.NOT_FOUND, "Dossier introuvable");
      const rows = await tx.select({ id: dealConversations.id, createdAt: dealConversations.createdAt }).from(dealConversations).where(eq(dealConversations.dealId, dealId)).orderBy(asc(dealConversations.createdAt), asc(dealConversations.id));
      return { items: rows.map((r) => ({ id: r.id, label: `Échange ${r.id.slice(-8)}`, createdAt: r.createdAt.toISOString() })) };
    });
  }

  /** Sans cible, un cédant n'obtient jamais un fil agrégé pouvant être pris pour une conversation. */
  async messages(dealId: string, principal: Principal, query: z.infer<typeof MessageQuerySchema>): Promise<MessagePage> {
    return withTenant(this.db, principal, async (tx) => {
      const deal = (await tx.select({ seller: deals.sellerOrganisationId }).from(deals).where(eq(deals.id, dealId)).limit(1))[0];
      if (!deal) throw new DealPmeError(ErrorCode.NOT_FOUND, "Dossier introuvable");
      const legacy = (await tx.select({ n: sql<number>`count(*)::int` }).from(dealMessages).where(and(eq(dealMessages.dealId, dealId), isNull(dealMessages.conversationId))))[0]?.n ?? 0;
      let conversationId: string | null = null;
      if (query.scope !== "legacy") {
        if (query.conversationId || deal.seller !== principal.organisationId) {
          const row = (await tx.select({ id: dealConversations.id }).from(dealConversations).where(and(
            eq(dealConversations.dealId, dealId),
            query.conversationId ? eq(dealConversations.id, query.conversationId) : eq(dealConversations.investorOrganisationId, principal.organisationId),
            or(eq(dealConversations.sellerOrganisationId, principal.organisationId), eq(dealConversations.investorOrganisationId, principal.organisationId)),
          )).limit(1))[0];
          if (!row && query.conversationId) throw new DealPmeError(ErrorCode.NOT_FOUND, "Conversation introuvable");
          conversationId = row?.id ?? null;
        }
        if (!conversationId) return { conversationId: null, items: [], nextCursor: null, legacyCount: legacy };
      }
      const rows = await tx.select({ id: dealMessages.id, conversationId: dealMessages.conversationId, body: dealMessages.body, createdAt: dealMessages.createdAt, sender: dealMessages.senderOrganisationId })
        .from(dealMessages).where(and(eq(dealMessages.dealId, dealId),
          conversationId ? eq(dealMessages.conversationId, conversationId) : isNull(dealMessages.conversationId),
          query.before ? lt(dealMessages.id, query.before) : undefined,
        )).orderBy(desc(dealMessages.id)).limit(query.limit + 1);
      const page = rows.slice(0, query.limit);
      return { conversationId, items: page.toReversed().map((r) => ({ id: r.id, conversationId: r.conversationId, body: r.body, createdAt: r.createdAt.toISOString(), mine: r.sender === principal.organisationId })), nextCursor: rows.length > query.limit ? page.at(-1)!.id : null, legacyCount: legacy };
    });
  }

  /** Tableau de bord du cédant : consultations et intérêts par dossier, cohérents avec les tables qui les portent. */
  async sellerDashboard(seller: Principal) {
    return withTenant(this.db, seller, async (tx) => {
      const rows = await tx
        .select({ id: deals.id, companyId: deals.companyId, status: deals.status, sectorCode: deals.sectorCode, regionCode: deals.regionCode, turnoverBand: deals.turnoverBand, dealType: deals.dealType })
        .from(deals)
        .where(eq(deals.sellerOrganisationId, seller.organisationId));
      if (rows.length === 0) return { items: [] };
      const ids = rows.map((r) => r.id);
      const views = await tx
        .select({ dealId: dealViews.dealId, total: sql<number>`count(*)::int`, distinctOrgs: sql<number>`count(distinct ${dealViews.viewerOrganisationId})::int` })
        .from(dealViews)
        .where(inArray(dealViews.dealId, ids))
        .groupBy(dealViews.dealId);
      const interestRows = await tx
        .select({ dealId: interests.dealId, total: sql<number>`count(*)::int` })
        .from(interests)
        .where(inArray(interests.dealId, ids))
        .groupBy(interests.dealId);
      const messageRows = await tx
        .select({ dealId: dealMessages.dealId, total: sql<number>`count(*)::int` })
        .from(dealMessages)
        .where(inArray(dealMessages.dealId, ids))
        .groupBy(dealMessages.dealId);
      const viewBy = new Map(views.map((v) => [v.dealId, v]));
      const interestBy = new Map(interestRows.map((i) => [i.dealId, i.total]));
      const messageBy = new Map(messageRows.map((m) => [m.dealId, m.total]));
      return {
        items: rows.map((r) => ({
          ...r,
          views: viewBy.get(r.id)?.total ?? 0,
          viewers: viewBy.get(r.id)?.distinctOrgs ?? 0,
          interests: interestBy.get(r.id) ?? 0,
          messages: messageBy.get(r.id) ?? 0,
        })),
      };
    });
  }

  /** Intérêts reçus sur un dossier, vus par le cédant. L'identité du repreneur reste au palier autorisé. */
  async interestsFor(dealId: string, seller: Principal) {
    return withTenant(this.db, seller, async (tx) => {
      const deal = (await tx.select({ id: deals.id, seller: deals.sellerOrganisationId }).from(deals).where(eq(deals.id, dealId)).limit(1))[0];
      if (!deal || deal.seller !== seller.organisationId) throw new DealPmeError(ErrorCode.NOT_FOUND, "Dossier introuvable");
      const rows = await tx
        .select({ id: interests.id, message: interests.message, createdAt: interests.createdAt, conversationId: dealConversations.id })
        .from(interests)
        .innerJoin(users, eq(users.id, interests.investorUserId))
        .leftJoin(dealConversations, and(eq(dealConversations.dealId, interests.dealId), eq(dealConversations.investorOrganisationId, users.organisationId)))
        .where(eq(interests.dealId, dealId))
        .orderBy(desc(interests.createdAt));
      return { items: rows.map((row) => ({ ...row, conversationLabel: row.conversationId ? `Échange ${row.conversationId.slice(-8)}` : null })) };
    });
  }

  /** Intérêts manifestés par l'organisation connectée, avec l'état T0 du dossier concerné. */
  async myInterests(principal: Principal) {
    return withTenant(this.db, principal, async (tx) => {
      const rows = await tx
        .select({
          id: interests.id,
          dealId: interests.dealId,
          message: interests.message,
          createdAt: interests.createdAt,
          status: deals.status,
          dealType: deals.dealType,
          sectorCode: deals.sectorCode,
          regionCode: deals.regionCode,
          turnoverBand: deals.turnoverBand,
        })
        .from(interests)
        .innerJoin(users, eq(users.id, interests.investorUserId))
        .innerJoin(deals, eq(deals.id, interests.dealId))
        .where(eq(users.organisationId, principal.organisationId))
        .orderBy(desc(interests.createdAt));
      const dealIds = [...new Set(rows.map((r) => r.dealId))];
      const messageRows = dealIds.length
        ? await tx.select({ dealId: dealMessages.dealId, total: sql<number>`count(*)::int` }).from(dealMessages).where(inArray(dealMessages.dealId, dealIds)).groupBy(dealMessages.dealId)
        : [];
      const byDeal = new Map(messageRows.map((m) => [m.dealId, m.total]));
      return { items: rows.map((r) => ({ ...r, messages: byDeal.get(r.dealId) ?? 0 })) };
    });
  }

  // ---------------------------------------------------------------- alertes

  /** Création d'une alerte. Le consentement est un acte séparé : sans lui, l'alerte existe mais n'envoie rien. */
  async createAlert(
    input: { label: string; sectorCode?: string | null; regionCode?: string | null; turnoverBand?: string | null; dealReadyOnly: boolean; notifyOptIn: boolean },
    principal: Principal,
    correlationId: string,
  ): Promise<{ alertId: string }> {
    const id = newId();
    await withTenant(this.db, principal, async (tx) => {
      await tx.insert(savedAlerts).values({
        id,
        userId: principal.userId,
        organisationId: principal.organisationId,
        label: input.label,
        sectorCode: input.sectorCode ?? null,
        regionCode: (input.regionCode ?? null) as never,
        turnoverBand: (input.turnoverBand ?? null) as never,
        dealReadyOnly: input.dealReadyOnly,
        notifyOptIn: input.notifyOptIn,
        optInAt: input.notifyOptIn ? new Date() : null,
      });
      await this.audit.record({ action: "ALERT_SAVED", actorUserId: principal.userId, subjectType: "saved_alert", subjectId: id, outcome: "OK", correlationId, metadata: { notifyOptIn: input.notifyOptIn } }, tx);
    });
    return { alertId: id };
  }

  async listAlerts(principal: Principal) {
    return withTenant(this.db, principal, async (tx) => {
      const rows = await tx.select().from(savedAlerts).where(and(eq(savedAlerts.organisationId, principal.organisationId), isNull(savedAlerts.revokedAt))).orderBy(desc(savedAlerts.createdAt));
      const deliveries = await tx.select({ id: notificationIntents.id, alertId: notificationIntents.alertId, dealId: notificationIntents.dealId, score: notificationIntents.score, reasons: notificationIntents.reasons, state: notificationIntents.state, attempts: notificationIntents.attempts, updatedAt: notificationIntents.updatedAt }).from(notificationIntents).where(eq(notificationIntents.userId, principal.userId)).orderBy(desc(notificationIntents.createdAt)).limit(100);
      return { items: rows, deliveries };
    });
  }

  /** Consentement révocable à tout moment, dans les deux sens, tracé à chaque changement. */
  async setAlertOptIn(alertId: string, optIn: boolean, principal: Principal, correlationId: string): Promise<void> {
    await withTenant(this.db, principal, async (tx) => {
      const row = (await tx.select({ id: savedAlerts.id }).from(savedAlerts).where(eq(savedAlerts.id, alertId)).limit(1))[0];
      if (!row) throw new DealPmeError(ErrorCode.NOT_FOUND, "Alerte introuvable");
      await tx.update(savedAlerts).set({ notifyOptIn: optIn, optInAt: optIn ? new Date() : null }).where(eq(savedAlerts.id, alertId));
      await this.audit.record({ action: "ALERT_OPT_IN_CHANGED", actorUserId: principal.userId, subjectType: "saved_alert", subjectId: alertId, outcome: "OK", correlationId, metadata: { optIn } }, tx);
    });
  }

  async deleteAlert(alertId: string, principal: Principal, correlationId: string): Promise<void> {
    await withTenant(this.db, principal, async (tx) => {
      const row = (await tx.select({ id: savedAlerts.id }).from(savedAlerts).where(eq(savedAlerts.id, alertId)).limit(1))[0];
      if (!row) throw new DealPmeError(ErrorCode.NOT_FOUND, "Alerte introuvable");
      await tx.update(savedAlerts).set({ revokedAt: new Date(), notifyOptIn: false }).where(eq(savedAlerts.id, alertId));
      await this.audit.record({ action: "ALERT_REVOKED", actorUserId: principal.userId, subjectType: "saved_alert", subjectId: alertId, outcome: "OK", correlationId }, tx);
    });
  }
}
