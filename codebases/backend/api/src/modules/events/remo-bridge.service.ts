import { Injectable } from "@nestjs/common";
import { createLocalRemo, createRemoApiAdapter, RemoError, AttendanceSchema, type RemoAttendance, type RemoPort, type RemoApiPort, type RemoEventRequest } from "@dealpme/connector-remo";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { loadEnv } from "../../config/env.js";
import { events, eventRegistrations } from "../../database/schema/core.js";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { AuditService } from "../../platform/audit.service.js";
import type { CoreTx } from "../../database/tenant.js";

/**
 * Pont d'intégration Remo.co (décision du 09/09/2026).
 *
 * Deux modes possibles, choisis par événement :
 *
   * 1. DEALPME_FIRST (défaut) : DealPME porte l'inscription, le consentement, l'attribution de campagne
 *    et la catégorisation des revenus pour la rétrocession CCI (P24). Remo reçoit les participants confirmés,
 *    fournit un lien d'accès unique par personne et héberge la session live (stands, tables, vidéo, chat).
 *    La présence remonte par webhook et alimente le rapport post-événement (P20, indicateurs CCI).
 *
 * 2. REMO_FIRST : Remo porte aussi la billetterie et l'inscription (paiement carte). DealPME synchronise
 *    les inscrits et les billets par API pour conserver l'attribution et le reporting. Réservé aux événements
 *    sans paiement mobile money et sans exigence de consentement DealPME spécifique.
 *
   * Invariants : présence rattachée à l'inscription DealPME ; le connecteur réel invite par email vérifié
   * avec accord distinct, sans transmettre les autres attributs de profil. Le HMAC du simulateur n'est
   * pas accepté comme webhook réel. Billetterie et synchronisation REMO_FIRST restent des extensions.
 */
export type RemoIntegrationMode = "DEALPME_FIRST" | "REMO_FIRST";

export interface DealPmeEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  mode: RemoIntegrationMode;
  remoEventId?: string;
  publicationKey: string;
  branding: RemoEventRequest["branding"];
  description?: string | undefined;
}

@Injectable()
export class RemoBridgeService {
  private readonly remo: RemoPort | null;
  readonly remote: RemoApiPort | null;
  readonly provider = loadEnv().CONNECTOR_REMO_PROVIDER;

  constructor(private readonly audit: AuditService) {
    const env = loadEnv();
    this.remote = env.CONNECTOR_REMO_PROVIDER === "remo" ? createRemoApiAdapter({ apiKey: env.CONNECTOR_REMO_API_KEY, companyId: env.REMO_COMPANY_ID!, baseUrl: env.REMO_API_BASE_URL, eventBaseUrl: env.REMO_EVENT_BASE_URL, floorTemplate: env.REMO_FLOOR_TEMPLATE, floorTheme: env.REMO_FLOOR_THEME, timeoutMs: env.REMO_TIMEOUT_MS }) : null;
    this.remo = this.remote ?? (env.CONNECTOR_REMO_PROVIDER === "local" ? createLocalRemo({ baseUrl: env.REMO_LOCAL_BASE_URL, apiKey: env.REMO_LOCAL_API_KEY, timeoutMs: env.REMO_TIMEOUT_MS }) : null);
  }

  /** Crée l'événement chez Remo et mémorise l'identifiant ; DealPME reste la référence des inscriptions. */
  async publishToRemo(event: DealPmeEvent): Promise<DealPmeEvent> {
    if (!this.remo || event.mode !== "DEALPME_FIRST") throw new RemoError("DISABLED");
    const created = await this.remo.createEvent({ requestKey: event.publicationKey, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt, capacity: event.capacity, branding: event.branding, description: event.description });
    return { ...event, remoEventId: created.remoEventId };
  }

  /** Admission locale pour un participant confirmé ; le parcours réel utilise invitation et connexion Remo/SAML. */
  joinUrl(event: DealPmeEvent, participantUserId: string, displayName: string): Promise<string> {
    if (!event.remoEventId || !this.remo) {
      throw new Error("Événement non publié chez Remo");
    }
    return this.remo.participantJoinUrl(event.remoEventId, participantUserId, displayName);
  }

  async cancel(publicationKey: string) { if (!this.remo) throw new RemoError("DISABLED"); await this.remo.cancelEvent(publicationKey); }
  async attendance(remoEventId: string) { if (!this.remo) throw new RemoError("DISABLED"); return this.remo.attendance(remoEventId); }
  assertRemoteAccount(event: { providerAccountKey: string | null; providerCompanyId: string | null }) {
    const env = loadEnv();
    if (!this.remote || event.providerAccountKey !== env.REMO_ACCOUNT_KEY || event.providerCompanyId !== env.REMO_COMPANY_ID) throw new DealPmeError(ErrorCode.CONFLICT, "La configuration active ne correspond pas au compte Remo de cet événement");
  }

  /** Webhook de présence : signature vérifiée avant tout traitement ; présence rattachée à l'identifiant DealPME. */
  async ingestAttendance(rawBody: string, signatureHeader: string, correlationId: string, tx: CoreTx): Promise<RemoAttendance[]> {
    if (!this.remo || !this.remo.verifyWebhook(rawBody, signatureHeader)) {
      throw new Error("Signature de webhook Remo invalide");
    }
    const attendances = AttendanceSchema.parse(JSON.parse(rawBody)).events;
    await tx.execute(sql`select set_config('app.service','event-webhook',true)`);
    for (const a of attendances) {
      const event = (await tx.select().from(events).where(and(eq(events.remoEventId,a.remoEventId),eq(events.provider,"local"))).limit(1))[0];
      let matched = false;
      if (event && event.status === "PUBLISHED" && z.uuid().safeParse(a.externalUserId).success && Date.parse(a.joinedAt) >= event.startsAt.getTime()-900000 && Date.parse(a.joinedAt) <= event.endsAt.getTime()+900000) {
        const updated = await tx.update(eventRegistrations).set({ joinedAt: sql`least(coalesce(${eventRegistrations.joinedAt},${a.joinedAt}::timestamptz),${a.joinedAt}::timestamptz)` }).where(and(eq(eventRegistrations.eventId,event.id),eq(eventRegistrations.userId,a.externalUserId),isNull(eventRegistrations.cancelledAt))).returning({id:eventRegistrations.id});
        matched = updated.length > 0;
      }
      await this.audit.record({ action: "PRIVILEGED_ACCESS_USED", actorUserId: null, subjectType: "remo_event", subjectId: a.remoEventId, outcome: "OK", correlationId, metadata: { participant: a.externalUserId, joinedAt: a.joinedAt, matched, provider: "local" } }, tx);
    }
    return attendances;
  }
}
