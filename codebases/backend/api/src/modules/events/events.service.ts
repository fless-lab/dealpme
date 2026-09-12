import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { newId } from "@dealpme/domain";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { diasporaAppointments, eventRegistrations, events } from "../../database/schema/core.js";
import { withTenant } from "../../database/tenant.js";
import { AuditService } from "../../platform/audit.service.js";
import type { Principal } from "../../platform/auth.js";
import { RemoBridgeService, type RemoIntegrationMode } from "./remo-bridge.service.js";

/**
 * Deal-Connect V1 : événements B2B avec session live chez Remo.co.
 * Invariants : DealPME reste la référence des inscriptions et de l'attribution ; aucun contenu à caractère
 * de titre financier sur un stand ; Remo ne reçoit que le nom d'affichage choisi par le participant.
 */
@Injectable()
export class EventsService {
  constructor(
    @Inject(CORE_DB) private readonly db: CoreDb,
    private readonly bridge: RemoBridgeService,
    private readonly audit: AuditService,
  ) {}

  async create(input: { title: string; description?: string | undefined; startsAt: string; endsAt: string; capacity: number; mode: RemoIntegrationMode; campaignId?: string | undefined }, organiser: Principal, correlationId: string) {
    const id = newId();
    await this.db.insert(events).values({
      id,
      title: input.title,
      description: input.description ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      capacity: input.capacity,
      integrationMode: input.mode,
      organiserUserId: organiser.userId,
      campaignId: input.campaignId ?? null,
    });
    this.audit.record({ action: "DEAL_CREATED", actorUserId: organiser.userId, subjectType: "event", subjectId: id, outcome: "OK", correlationId, metadata: { mode: input.mode } });
    return { eventId: id };
  }

  /** Publication : crée l'événement chez Remo et passe le statut à PUBLISHED. */
  async publish(eventId: string, organiser: Principal, correlationId: string) {
    const ev = (await this.db.select().from(events).where(eq(events.id, eventId)).limit(1))[0];
    if (!ev) throw new DealPmeError(ErrorCode.NOT_FOUND, "Événement introuvable");
    const published = await this.bridge.publishToRemo({
      id: ev.id,
      title: ev.title,
      startsAt: ev.startsAt.toISOString(),
      endsAt: ev.endsAt.toISOString(),
      capacity: ev.capacity,
      mode: ev.integrationMode as RemoIntegrationMode,
    });
    await this.db.update(events).set({ remoEventId: published.remoEventId ?? null, status: "PUBLISHED" }).where(eq(events.id, eventId));
    this.audit.record({ action: "DEAL_TRANSITION", actorUserId: organiser.userId, subjectType: "event", subjectId: eventId, outcome: "OK", correlationId, metadata: { status: "PUBLISHED", remoEventId: published.remoEventId ?? null } });
    return { eventId, remoEventId: published.remoEventId ?? null };
  }

  /**
   * Événements publiés, avec les places restantes et, pour un compte connecté, sa propre inscription.
   * Le nombre d'inscrits est un décompte, jamais une liste : les autres participants ne se voient pas
   * tant qu'ils n'ont pas consenti à l'échange de contacts pendant l'événement.
   */
  async listPublished(principal: Principal | null) {
    const rows = await this.db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        capacity: events.capacity,
        campaignId: events.campaignId,
        integrationMode: events.integrationMode,
        liveReady: events.remoEventId,
      })
      .from(events)
      .where(eq(events.status, "PUBLISHED"))
      .orderBy(asc(events.startsAt));
    if (rows.length === 0) return { items: [] };
    const ids = rows.map((r) => r.id);
    const counts = await this.db
      .select({ eventId: eventRegistrations.eventId, n: count() })
      .from(eventRegistrations)
      .where(inArray(eventRegistrations.eventId, ids))
      .groupBy(eventRegistrations.eventId);
    const byEvent = new Map(counts.map((c) => [c.eventId, Number(c.n)]));
    const mine = principal
      ? await withTenant(this.db, principal, (tx) =>
          tx
            .select({ eventId: eventRegistrations.eventId, displayName: eventRegistrations.displayName, consentContactAt: eventRegistrations.consentContactAt })
            .from(eventRegistrations)
            .where(and(inArray(eventRegistrations.eventId, ids), eq(eventRegistrations.userId, principal.userId))),
        )
      : [];
    const mineByEvent = new Map(mine.map((m) => [m.eventId, m]));
    return {
      items: rows.map((r) => {
        const registered = mineByEvent.get(r.id);
        const taken = byEvent.get(r.id) ?? 0;
        return {
          id: r.id,
          title: r.title,
          description: r.description,
          startsAt: r.startsAt,
          endsAt: r.endsAt,
          capacity: r.capacity,
          registered: taken,
          seatsLeft: Math.max(0, r.capacity - taken),
          campaignId: r.campaignId,
          integrationMode: r.integrationMode,
          /** L'événement existe chez l'hébergeur de la session live : le lien d'accès peut être délivré. */
          liveReady: !!r.liveReady,
          myRegistration: registered ? { displayName: registered.displayName, consentContact: !!registered.consentContactAt } : null,
        };
      }),
    };
  }

  /** Inscription DEALPME_FIRST : consentement d'échange de contacts explicite, jamais pré-coché. */
  async register(eventId: string, participant: Principal, displayName: string, consentContact: boolean, correlationId: string) {
    const ev = (await this.db.select().from(events).where(eq(events.id, eventId)).limit(1))[0];
    if (!ev || ev.status !== "PUBLISHED") throw new DealPmeError(ErrorCode.NOT_FOUND, "Événement introuvable");

    const [taken] = await this.db.select({ n: count() }).from(eventRegistrations).where(eq(eventRegistrations.eventId, eventId));
    if (Number(taken?.n ?? 0) >= ev.capacity) {
      throw new DealPmeError(ErrorCode.CONFLICT, "L'événement est complet. Aucune inscription supplémentaire n'est enregistrée.", { capacity: ev.capacity });
    }
    const already = (
      await withTenant(this.db, participant, (tx) =>
        tx.select({ id: eventRegistrations.id }).from(eventRegistrations).where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, participant.userId))).limit(1),
      )
    )[0];
    if (already) throw new DealPmeError(ErrorCode.CONFLICT, "Vous êtes déjà inscrit à cet événement");

    const id = newId();
    // Politique RLS : une inscription n'est visible et modifiable que par son auteur (ou un officier).
    await withTenant(this.db, participant, (tx) => tx.insert(eventRegistrations).values({ id, eventId, userId: participant.userId, displayName, consentContactAt: consentContact ? new Date() : null }));
    // L'attribution de campagne suit l'inscription : c'est elle qui rattachera plus tard une transaction à
    // l'événement qui l'a provoquée. Elle est portée par l'événement et journalisée, jamais saisie par le participant.
    this.audit.record({
      action: "EVENT_REGISTERED",
      actorUserId: participant.userId,
      subjectType: "event",
      subjectId: eventId,
      outcome: "OK",
      correlationId,
      metadata: { campaignId: ev.campaignId, consentContact, integrationMode: ev.integrationMode },
    });
    return { registrationId: id, campaignId: ev.campaignId };
  }

  /**
   * Consentement à l'échange de contacts : révocable dans les deux sens jusqu'à la tenue de l'événement.
   * Sans lui, le nom d'affichage circule mais aucune coordonnée n'est échangée.
   */
  async setContactConsent(eventId: string, participant: Principal, consent: boolean, correlationId: string): Promise<void> {
    const updated = await withTenant(this.db, participant, (tx) =>
      tx
        .update(eventRegistrations)
        .set({ consentContactAt: consent ? new Date() : null })
        .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, participant.userId)))
        .returning({ id: eventRegistrations.id }),
    );
    if (updated.length === 0) throw new DealPmeError(ErrorCode.NOT_FOUND, "Inscription introuvable");
    this.audit.record({ action: "EVENT_CONSENT_CHANGED", actorUserId: participant.userId, subjectType: "event", subjectId: eventId, outcome: "OK", correlationId, metadata: { consent } });
  }

  /** Lien d'accès unique : réservé aux inscrits d'un événement publié chez Remo. */
  async joinUrl(eventId: string, participant: Principal) {
    const ev = (await this.db.select().from(events).where(eq(events.id, eventId)).limit(1))[0];
    const reg = (await withTenant(this.db, participant, (tx) => tx.select().from(eventRegistrations).where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, participant.userId))).limit(1)))[0];
    if (!ev || !reg) throw new DealPmeError(ErrorCode.NOT_FOUND, "Inscription introuvable");
    if (!ev.remoEventId) throw new DealPmeError(ErrorCode.CONFLICT, "Événement non encore publié chez Remo");
    const url = await this.bridge.joinUrl({ id: ev.id, title: ev.title, startsAt: ev.startsAt.toISOString(), endsAt: ev.endsAt.toISOString(), capacity: ev.capacity, mode: ev.integrationMode as RemoIntegrationMode, remoEventId: ev.remoEventId }, participant.userId, reg.displayName);
    return { joinUrl: url };
  }

  /** Guichet Diaspora V1 : demande de rendez-vous ; la confirmation humaine crée ensuite l'entretien vidéo chez Remo. */
  async requestAppointment(investor: Principal, requestedSlot: string, dealId: string | null, crossBorderNoticeAcknowledged: boolean, correlationId: string) {
    if (!crossBorderNoticeAcknowledged) {
      throw new DealPmeError(ErrorCode.VALIDATION_FAILED, "Les contraintes transfrontalières doivent être présentées et reconnues avant toute demande (P21)");
    }
    const id = newId();
    await withTenant(this.db, investor, (tx) => tx.insert(diasporaAppointments).values({ id, investorUserId: investor.userId, dealId, requestedSlot: new Date(requestedSlot), crossBorderNoticeShownAt: new Date() }));
    this.audit.record({ action: "INTEREST_EXPRESSED", actorUserId: investor.userId, subjectType: "diaspora_appointment", subjectId: id, outcome: "OK", correlationId });
    return { appointmentId: id, status: "REQUESTED" };
  }
}
