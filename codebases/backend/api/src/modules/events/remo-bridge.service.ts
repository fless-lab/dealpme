import { Injectable } from "@nestjs/common";
import { createFakeRemo, type RemoAttendance, type RemoPort } from "@dealpme/connector-remo";
import { AuditService } from "../../platform/audit.service.js";
import type { CoreTx } from "../../database/tenant.js";

/**
 * Pont d'intégration Remo.co (décision du 09/09/2026).
 *
 * Deux modes possibles, choisis par événement :
 *
 * 1. DEALPME_FIRST (défaut) : DealPME porte l'inscription, la billetterie (mobile money via le connecteur
 *    mobile-money, ou paiement carte natif Remo pour la diaspora), le consentement, l'attribution de campagne
 *    et la catégorisation des revenus pour la rétrocession CCI (P24). Remo reçoit les participants confirmés,
 *    fournit un lien d'accès unique par personne et héberge la session live (stands, tables, vidéo, chat).
 *    La présence remonte par webhook et alimente le rapport post-événement (P20, indicateurs CCI).
 *
 * 2. REMO_FIRST : Remo porte aussi la billetterie et l'inscription (paiement carte). DealPME synchronise
 *    les inscrits et les billets par API pour conserver l'attribution et le reporting. Réservé aux événements
 *    sans paiement mobile money et sans exigence de consentement DealPME spécifique.
 *
 * Invariants quels que soient les modes : aucun contenu à caractère de titre financier sur les stands (hors périmètre
 * réglementaire par construction), présence stockée sous identifiant DealPME, aucune donnée nominative supplémentaire
 * transmise à Remo au-delà du nom d'affichage choisi.
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
}

@Injectable()
export class RemoBridgeService {
  private readonly remo: RemoPort;

  constructor(private readonly audit: AuditService) {
    // L'adaptateur réel (createRemoApiAdapter) remplace le faux dès que le plan Remo et la clé API sont connus.
    this.remo = createFakeRemo();
  }

  /** Crée l'événement chez Remo et mémorise l'identifiant ; DealPME reste la référence des inscriptions. */
  async publishToRemo(event: DealPmeEvent): Promise<DealPmeEvent> {
    const created = await this.remo.createEvent({ title: event.title, startsAt: event.startsAt, endsAt: event.endsAt, capacity: event.capacity });
    return { ...event, remoEventId: created.remoEventId };
  }

  /** Lien d'accès unique pour un participant confirmé (inscription et paiement validés côté DealPME). */
  joinUrl(event: DealPmeEvent, participantUserId: string, displayName: string): Promise<string> {
    if (!event.remoEventId) {
      throw new Error("Événement non publié chez Remo");
    }
    return this.remo.participantJoinUrl(event.remoEventId, participantUserId, displayName);
  }

  /** Webhook de présence : signature vérifiée avant tout traitement ; présence rattachée à l'identifiant DealPME. */
  async ingestAttendance(rawBody: string, signatureHeader: string, correlationId: string, tx: CoreTx): Promise<RemoAttendance[]> {
    if (!this.remo.verifyWebhook(rawBody, signatureHeader)) {
      throw new Error("Signature de webhook Remo invalide");
    }
    const attendances = this.remo.parseAttendance(rawBody);
    for (const a of attendances) {
      await this.audit.record({ action: "PRIVILEGED_ACCESS_USED", actorUserId: null, subjectType: "remo_event", subjectId: a.remoEventId, outcome: "OK", correlationId, metadata: { participant: a.externalUserId, joinedAt: a.joinedAt } }, tx);
    }
    return attendances;
  }
}
