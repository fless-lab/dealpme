import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { RemoError } from "@dealpme/connector-remo";
import { newId } from "@dealpme/domain";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { events, eventRegistrations, users } from "../../database/schema/core.js";
import { withTenant } from "../../database/tenant.js";
import { AuditService } from "../../platform/audit.service.js";
import type { Principal } from "../../platform/auth.js";
import { RemoBridgeService } from "./remo-bridge.service.js";

@Injectable()
export class RemoMembersService {
  constructor(@Inject(CORE_DB) private readonly db: CoreDb, private readonly bridge: RemoBridgeService, private readonly audit: AuditService) {}

  private async rejected(error:unknown,eventId:string,actor:Principal,correlationId:string,operation:string):Promise<never> {
    // Le refus est conservé après rollback, sans adresse email ni message fournisseur.
    if(error instanceof DealPmeError)await this.audit.rejection({action:"EVENT_REGISTERED",actorUserId:actor.userId,subjectType:"event",subjectId:eventId,outcome:"BLOCKED",correlationId,metadata:{operation,code:error.code}});
    throw error;
  }

  /** Persiste le début avant le POST qui envoie un email. Aucun rejeu aveugle de ce POST. */
  async ensureInvitation(eventId: string, userId: string, actor: Principal, correlationId: string) {
    const remote = this.bridge.remote;
    if (!remote) throw new DealPmeError(ErrorCode.CONFLICT, "Invitations Remo indisponibles");
    const prepared = await withTenant(this.db, actor, async tx => {
      const event = (await tx.select().from(events).where(eq(events.id, eventId)).limit(1))[0];
      if (!event || (actor.userId !== userId && actor.userId !== event.organiserUserId)) throw new DealPmeError(ErrorCode.NOT_FOUND, "Inscription introuvable");
      if (event.status !== "PUBLISHED" || event.provider !== "remo" || !event.remoEventId || event.endsAt.getTime() <= Date.now()) throw new DealPmeError(ErrorCode.CONFLICT, "Salle non publiée chez Remo ou événement terminé");
      this.bridge.assertRemoteAccount(event);
      const reg = (await tx.select().from(eventRegistrations).where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.userId, userId), isNull(eventRegistrations.cancelledAt))).for("update").limit(1))[0];
      const user = (await tx.select({ email: users.email, verified: users.emailVerifiedAt }).from(users).where(eq(users.id, userId)).limit(1))[0];
      if (!reg || !user) throw new DealPmeError(ErrorCode.NOT_FOUND, "Inscription introuvable");
      if (!["attendee", "speaker"].includes(reg.providerRole)) throw new DealPmeError(ErrorCode.CONFLICT, "Rôle fournisseur à rapprocher");
      if (!reg.providerConsentAt || !user.verified) throw new DealPmeError(ErrorCode.VALIDATION_FAILED, "L'envoi de votre email à Remo et une adresse vérifiée sont requis pour l'invitation");
      const email = user.email.toLowerCase();
      if (reg.providerEmail && reg.providerEmail !== email) throw new DealPmeError(ErrorCode.CONFLICT, "Adresse modifiée depuis l'invitation : rapprochement organisateur requis");
      if (reg.invitationState === "SENDING" && reg.invitationStartedAt && reg.invitationStartedAt.getTime() > Date.now() - 60000) throw new DealPmeError(ErrorCode.CONFLICT, "Invitation en cours ; actualisez dans un instant");
      const reconcile = ["SENT", "UNKNOWN", "SENDING"].includes(reg.invitationState);
      const attemptId = newId();
      await tx.update(eventRegistrations).set({ providerEmail: email, invitationState: "SENDING", invitationStartedAt: new Date(), invitationAttemptId: attemptId }).where(eq(eventRegistrations.id, reg.id));
      await this.audit.record({ action: "EVENT_REGISTERED", actorUserId: actor.userId, subjectType: "event_registration", subjectId: reg.id, outcome: "OK", correlationId, metadata: { operation: reconcile ? "REMO_INVITATION_RECONCILING" : "REMO_INVITATION_STARTED", attemptId } }, tx);
      return { reg, email, remoteId: event.remoEventId, reconcile, attemptId };
    }).catch(error=>this.rejected(error,eventId,actor,correlationId,"REMO_INVITATION_REJECTED"));
    const currentAttempt = () => and(eq(eventRegistrations.id,prepared.reg.id),eq(eventRegistrations.invitationAttemptId,prepared.attemptId),eq(eventRegistrations.providerRole,prepared.reg.providerRole),eq(eventRegistrations.providerEmail,prepared.email),isNull(eventRegistrations.cancelledAt));
    try {
    if (prepared.reconcile) {
      const roster = await remote.attendees(prepared.remoteId);
      if (!roster.some(a => a.email.toLowerCase() === prepared.email && !a.blocked && a.role === prepared.reg.providerRole)) throw new DealPmeError(ErrorCode.CONFLICT, "Invitation ou rôle non conforme chez Remo ; aucune nouvelle invitation n'a été renvoyée automatiquement");
    } else {
      await remote.addMembers(prepared.remoteId, [prepared.email], prepared.reg.providerRole === "speaker" ? "speaker" : "attendee");
    }
    } catch (error) {
        // Une réponse perdue/malformée ou 5xx peut suivre une acceptation : conserver UNKNOWN.
        const knownRejected = !prepared.reconcile && error instanceof RemoError && ["AUTHENTICATION", "FORBIDDEN", "RATE_LIMITED", "REJECTED"].includes(error.code);
        await withTenant(this.db, actor, async tx => {
          const changed=await tx.update(eventRegistrations).set({ invitationState: knownRejected ? "FAILED" : "UNKNOWN" }).where(currentAttempt()).returning({id:eventRegistrations.id});
          await this.audit.record({ action: "EVENT_REGISTERED", actorUserId: actor.userId, subjectType: "event_registration", subjectId: prepared.reg.id, outcome: "FAILED", correlationId, metadata: { operation: changed.length?"REMO_INVITATION":"REMO_INVITATION_SUPERSEDED", code: error instanceof RemoError ? error.code : "UNKNOWN", attemptId: prepared.attemptId } }, tx);
        });
        throw new DealPmeError(ErrorCode.CONFLICT, "Invitation Remo non confirmée ; l'inscription DealPME reste enregistrée");
    }
    const confirmed=await withTenant(this.db, actor, async tx => {
      const user=(await tx.select({email:users.email,verified:users.emailVerifiedAt}).from(users).where(eq(users.id,userId)).for("share").limit(1))[0];
      const event=(await tx.select().from(events).where(eq(events.id,eventId)).limit(1))[0];
      const admissible=!!user?.verified&&user.email.toLowerCase()===prepared.email&&event?.status==="PUBLISHED"&&event.endsAt.getTime()>Date.now();
      const changed=await tx.update(eventRegistrations).set({ invitationState: admissible?"SENT":"UNKNOWN" }).where(currentAttempt()).returning({id:eventRegistrations.id});
      if(!changed.length) {
        await this.audit.record({action:"EVENT_REGISTERED",actorUserId:actor.userId,subjectType:"event_registration",subjectId:prepared.reg.id,outcome:"BLOCKED",correlationId,metadata:{operation:"REMO_INVITATION_SUPERSEDED",attemptId:prepared.attemptId}},tx);
        return false;
      }
      await this.audit.record({ action: "EVENT_REGISTERED", actorUserId: actor.userId, subjectType: "event_registration", subjectId: prepared.reg.id, outcome: admissible?"OK":"FAILED", correlationId, metadata: { operation: admissible?(prepared.reconcile ? "REMO_INVITATION_RECONCILED" : "REMO_INVITATION_ACCEPTED"):"REMO_INVITATION_STALE", attemptId:prepared.attemptId } }, tx);
      return admissible;
    });
    if(!confirmed) throw new DealPmeError(ErrorCode.CONFLICT,"L'inscription ou une tentative plus récente a changé ; le résultat tardif n'a pas été appliqué");
    return { invitationState: "SENT" };
  }

  async synchronise(eventId: string, actor: Principal, correlationId: string, cursor?: string, limit=20) {
    const registrations = await withTenant(this.db, actor, async tx => {
      const event = (await tx.select({ id: events.id }).from(events).where(and(eq(events.id, eventId), eq(events.organiserUserId, actor.userId))).limit(1))[0];
      if (!event) throw new DealPmeError(ErrorCode.NOT_FOUND, "Événement introuvable");
      return tx.select({ id: eventRegistrations.id, userId: eventRegistrations.userId }).from(eventRegistrations).where(and(eq(eventRegistrations.eventId, eventId), isNull(eventRegistrations.cancelledAt), cursor ? gt(eventRegistrations.id,cursor) : undefined)).orderBy(asc(eventRegistrations.id)).limit(limit+1);
    });
    const results = [];
    for (const reg of registrations.slice(0,limit)) {
      try { results.push({ id: reg.id, ...await this.ensureInvitation(eventId, reg.userId, actor, correlationId) }); }
      catch (error) { results.push({ id: reg.id, invitationState: "TO_REVIEW", message: error instanceof DealPmeError ? error.message : "Fournisseur indisponible" }); }
    }
    return { items: results, nextCursor: registrations.length>limit?registrations[limit-1]!.id:null };
  }

  async changeGroup(eventId: string, registrationId: string, code: string, add: boolean, actor: Principal, correlationId: string) {
    const remote = this.bridge.remote;
    if (!remote) throw new DealPmeError(ErrorCode.CONFLICT, "Groupes Remo indisponibles");
    const prepared = await withTenant(this.db, actor, async tx => {
      const event = (await tx.select().from(events).where(and(eq(events.id, eventId), eq(events.organiserUserId, actor.userId))).limit(1))[0];
      const reg = (await tx.select().from(eventRegistrations).where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.id, registrationId),isNull(eventRegistrations.cancelledAt))).limit(1))[0];
      if (!event || !reg) throw new DealPmeError(ErrorCode.NOT_FOUND, "Inscription introuvable");
      if (event.provider !== "remo" || event.status !== "PUBLISHED" || !event.remoEventId || !reg.providerEmail || reg.invitationState !== "SENT" || !reg.providerConsentAt) throw new DealPmeError(ErrorCode.CONFLICT, "Invitation Remo confirmée requise");
      this.bridge.assertRemoteAccount(event);
      const user=(await tx.select({email:users.email,verified:users.emailVerifiedAt}).from(users).where(eq(users.id,reg.userId)).for("share").limit(1))[0];
      if(!user?.verified||user.email.toLowerCase()!==reg.providerEmail) throw new DealPmeError(ErrorCode.CONFLICT,"Le destinataire courant ne correspond plus à l'invitation Remo");
      await this.audit.record({ action: "EVENT_REGISTERED", actorUserId: actor.userId, subjectType: "event_registration", subjectId: reg.id, outcome: "OK", correlationId, metadata: { operation: "REMO_GROUP_CHANGE_STARTED", group: code, add } }, tx);
      return { id: reg.id, remoteId: event.remoEventId, email: reg.providerEmail };
    }).catch(error=>this.rejected(error,eventId,actor,correlationId,"REMO_GROUP_REJECTED"));
    try { await remote.changeGroup(prepared.remoteId, code, prepared.email, add); }
    catch (error) {
      await this.audit.rejection({ action: "EVENT_REGISTERED", actorUserId: actor.userId, subjectType: "event_registration", subjectId: prepared.id, outcome: "FAILED", correlationId, metadata: { operation: "REMO_GROUP_CHANGE_FAILED", group: code, code: error instanceof RemoError ? error.code : "UNKNOWN" } });
      throw new DealPmeError(ErrorCode.CONFLICT, "Association au groupe non confirmée par Remo ; vérifiez le groupe et son état avant de réessayer");
    }
    await withTenant(this.db, actor, async tx => { await this.audit.record({ action: "EVENT_REGISTERED", actorUserId: actor.userId, subjectType: "event_registration", subjectId: prepared.id, outcome: "OK", correlationId, metadata: { operation: add ? "REMO_GROUP_ADDED" : "REMO_GROUP_REMOVED", group: code } }, tx); });
    return { applied: true };
  }

  async inviteSpeaker(eventId: string, registrationId: string, actor: Principal, correlationId: string) {
    const userId = await withTenant(this.db, actor, async tx => {
      const event = (await tx.select().from(events).where(and(eq(events.id, eventId), eq(events.organiserUserId, actor.userId))).limit(1))[0];
      const reg = (await tx.select().from(eventRegistrations).where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.id, registrationId),isNull(eventRegistrations.cancelledAt))).for("update").limit(1))[0];
      if (!event || !reg) throw new DealPmeError(ErrorCode.NOT_FOUND, "Inscription introuvable");
      this.bridge.assertRemoteAccount(event);
      if (event.status !== "PUBLISHED" || event.endsAt.getTime() <= Date.now() || !reg.providerConsentAt) throw new DealPmeError(ErrorCode.CONFLICT, "Événement ouvert et accord d'invitation requis");
      const user=(await tx.select({email:users.email,verified:users.emailVerifiedAt}).from(users).where(eq(users.id,reg.userId)).for("share").limit(1))[0];
      if(!user?.verified||(reg.providerEmail&&reg.providerEmail!==user.email.toLowerCase()))throw new DealPmeError(ErrorCode.CONFLICT,"Le destinataire courant ne correspond plus à l'invitation Remo");
      if (reg.providerRole !== "speaker") {
        if (["SENDING", "UNKNOWN"].includes(reg.invitationState)) throw new DealPmeError(ErrorCode.CONFLICT, "Rapprochez l'invitation précédente avant de modifier le rôle");
        await tx.update(eventRegistrations).set({ providerRole: "speaker", invitationState: "NONE", invitationStartedAt: null, invitationAttemptId:null }).where(eq(eventRegistrations.id, reg.id));
        await this.audit.record({ action: "EVENT_REGISTERED", actorUserId: actor.userId, subjectType: "event_registration", subjectId: reg.id, outcome: "OK", correlationId, metadata: { operation: "REMO_SPEAKER_REQUESTED" } }, tx);
      }
      return reg.userId;
    }).catch(error=>this.rejected(error,eventId,actor,correlationId,"REMO_SPEAKER_REJECTED"));
    return this.ensureInvitation(eventId, userId, actor, correlationId);
  }
}
