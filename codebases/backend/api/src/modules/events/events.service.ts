import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
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

  listPublished() {
    return this.db
      .select({ id: events.id, title: events.title, description: events.description, startsAt: events.startsAt, endsAt: events.endsAt, capacity: events.capacity })
      .from(events)
      .where(eq(events.status, "PUBLISHED"))
      .orderBy(desc(events.startsAt));
  }

  /** Inscription DEALPME_FIRST : consentement d'échange de contacts explicite, jamais pré-coché. */
  async register(eventId: string, participant: Principal, displayName: string, consentContact: boolean, correlationId: string) {
    const ev = (await this.db.select().from(events).where(eq(events.id, eventId)).limit(1))[0];
    if (!ev || ev.status !== "PUBLISHED") throw new DealPmeError(ErrorCode.NOT_FOUND, "Événement introuvable");
    const id = newId();
    // Politique RLS : une inscription n'est visible et modifiable que par son auteur (ou un officier).
    await withTenant(this.db, participant, (tx) => tx.insert(eventRegistrations).values({ id, eventId, userId: participant.userId, displayName, consentContactAt: consentContact ? new Date() : null }));
    this.audit.record({ action: "INTEREST_EXPRESSED", actorUserId: participant.userId, subjectType: "event", subjectId: eventId, outcome: "OK", correlationId });
    return { registrationId: id };
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
