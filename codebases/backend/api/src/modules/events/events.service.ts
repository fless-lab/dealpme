import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { newId } from "@dealpme/domain";
import { RemoError } from "@dealpme/connector-remo";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { diasporaAppointments, eventRegistrations, events, eventReservations, eventProviderAccounts, deals, users } from "../../database/schema/core.js";
import { withTenant, type CoreTx } from "../../database/tenant.js";
import { AuditService } from "../../platform/audit.service.js";
import type { Principal } from "../../platform/auth.js";
import { loadEnv } from "../../config/env.js";
import { RemoBridgeService, type DealPmeEvent, type RemoIntegrationMode } from "./remo-bridge.service.js";
import { reserveSharedEvent } from "./reservations.js";
import type { CreateEventInput } from "./event.schemas.js";
import { RemoMembersService } from "./remo-members.service.js";

type Event = typeof events.$inferSelect;
const toProvider = (e: Event): DealPmeEvent => ({ id:e.id,title:e.title,description:e.description??"",startsAt:e.startsAt.toISOString(),endsAt:e.endsAt.toISOString(),capacity:e.capacity,mode:e.integrationMode as RemoIntegrationMode,publicationKey:e.publicationKey!,branding:e.branding,...(e.remoEventId?{remoEventId:e.remoEventId}:{}) });
const activeOperation = (e: Event) => ["PUBLISHING","CANCEL_PENDING"].includes(e.status) && !!e.syncStartedAt && e.syncStartedAt.getTime()>Date.now()-60000;

@Injectable()
export class EventsService {
  constructor(@Inject(CORE_DB) private readonly db: CoreDb, private readonly bridge: RemoBridgeService, private readonly audit: AuditService, private readonly members: RemoMembersService) {}
  private async branding(input:CreateEventInput,tx:CoreTx) {
    const env=loadEnv(),account=(await tx.select().from(eventProviderAccounts).where(eq(eventProviderAccounts.key,env.REMO_ACCOUNT_KEY)).limit(1))[0];
    const defaults=account?.branding??{label:env.REMO_ACCOUNT_BRAND_LABEL,accent:env.REMO_ACCOUNT_BRAND_ACCENT,welcome:env.REMO_ACCOUNT_BRAND_WELCOME};
    return {branding:input.brandingSource==="ACCOUNT"?defaults:input.branding,brandingOrigin:{scope:input.brandingSource,version:input.brandingSource==="ACCOUNT"?(account?.branding?`account-${account.brandRevision}`:env.REMO_ACCOUNT_BRAND_VERSION):"event-v1"}};
  }

  private async owned(tx: CoreTx, id: string, organiser: Principal) {
    const event=(await tx.select().from(events).where(and(eq(events.id,id),eq(events.organiserUserId,organiser.userId))).for("update").limit(1))[0];
    if(!event) throw new DealPmeError(ErrorCode.NOT_FOUND,"Événement introuvable dans votre espace organisateur");
    return event;
  }
  async create(input: CreateEventInput, organiser: Principal, correlationId: string) {
    if(input.mode!=="DEALPME_FIRST") throw new DealPmeError(ErrorCode.INVALID_TRANSITION,"REMO_FIRST attend la qualification de la synchronisation des inscriptions et billets");
    const id=input.requestId??newId(), creationHash=createHash("sha256").update(JSON.stringify({...input,requestId:undefined})).digest("hex");
    await withTenant(this.db,organiser,async(tx)=>{
      const inserted=await tx.insert(events).values({id,creationHash,title:input.title,description:input.description??null,startsAt:new Date(input.startsAt),endsAt:new Date(input.endsAt),capacity:input.capacity,integrationMode:input.mode,campaignId:input.campaignId??null,...await this.branding(input,tx),organiserUserId:organiser.userId,provider:this.bridge.provider}).onConflictDoNothing().returning({id:events.id});
      if(!inserted.length) { const prior=(await tx.select().from(events).where(and(eq(events.id,id),eq(events.organiserUserId,organiser.userId))).limit(1))[0]; if(!prior||prior.creationHash!==creationHash) throw new DealPmeError(ErrorCode.CONFLICT,"Clé de création déjà utilisée avec une autre requête"); return; }
      await this.audit.record({action:"DEAL_CREATED",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{mode:input.mode}},tx);
    });
    return {eventId:id};
  }
  async update(id:string,input:CreateEventInput & {expectedRevision:number},organiser:Principal,correlationId:string) {
    return withTenant(this.db,organiser,async(tx)=>{
      const e=await this.owned(tx,id,organiser);
      if(!["DRAFT","CREATE_REJECTED"].includes(e.status)||e.revision!==input.expectedRevision||e.audience!=="PUBLIC") throw new DealPmeError(ErrorCode.CONFLICT,"Brouillon modifié ou déjà publié : actualisez avant de modifier");
      if(e.status==="CREATE_REJECTED"&&(Date.parse(input.startsAt)!==e.startsAt.getTime()||Date.parse(input.endsAt)!==e.endsAt.getTime())) throw new DealPmeError(ErrorCode.CONFLICT,"Le créneau reste réservé pendant la correction ; annulez le brouillon pour changer de dates");
      if(input.mode!=="DEALPME_FIRST") throw new DealPmeError(ErrorCode.INVALID_TRANSITION,"REMO_FIRST non qualifié");
      await tx.update(events).set({title:input.title,description:input.description??null,startsAt:new Date(input.startsAt),endsAt:new Date(input.endsAt),capacity:input.capacity,campaignId:input.campaignId??null,...await this.branding(input,tx),revision:e.revision+1}).where(eq(events.id,id));
      await this.audit.record({action:"DEAL_TRANSITION",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{operation:"EDIT",revision:e.revision+1}},tx);
      return {eventId:id};
    });
  }
  async managed(principal:Principal) {
    return withTenant(this.db,principal,async(tx)=>({items:await tx.select().from(events).where(eq(events.organiserUserId,principal.userId)).orderBy(desc(events.createdAt)).limit(100),provider:this.bridge.provider,account:{key:loadEnv().REMO_ACCOUNT_KEY,concurrentLimit:loadEnv().REMO_MAX_CONCURRENT,marginMinutes:loadEnv().REMO_MARGIN_MINUTES,qualification:this.bridge.provider==="remo"?loadEnv().REMO_QUOTA_REFERENCE:"SIMULATION_LOCALE_NON_CONTRACTUELLE"}}));
  }
  async detail(id:string,principal:Principal) {
    return withTenant(this.db,principal,async(tx)=>{
      const event=await this.owned(tx,id,principal);
      const registrations=await tx.select({id:eventRegistrations.id,displayName:eventRegistrations.displayName,consentContactAt:eventRegistrations.consentContactAt,providerConsentAt:eventRegistrations.providerConsentAt,invitationState:eventRegistrations.invitationState,providerRole:eventRegistrations.providerRole,joinedAt:eventRegistrations.joinedAt,createdAt:eventRegistrations.createdAt}).from(eventRegistrations).where(and(eq(eventRegistrations.eventId,id),isNull(eventRegistrations.cancelledAt))).orderBy(asc(eventRegistrations.createdAt)).limit(5000);
      const reservations=await tx.select().from(eventReservations).where(and(eq(eventReservations.productKey,"dealpme"),eq(eventReservations.resourceId,id)));
      return {...event,registrations,reservation:reservations[0]??null};
    });
  }
  async publish(id:string,organiser:Principal,correlationId:string) {
    if(this.bridge.provider==="disabled") throw new DealPmeError(ErrorCode.CONFLICT,"Fournisseur événementiel désactivé");
    const prepared=await withTenant(this.db,organiser,async(tx)=>{
      const e=await this.owned(tx,id,organiser);
      if(e.status==="PUBLISHED") return e;
      if(this.bridge.provider==="remo" && e.publicationKey && ["SYNC_UNKNOWN","PUBLISHING"].includes(e.status)) throw new DealPmeError(ErrorCode.CONFLICT,"Remo ne documente pas d'idempotence de création : renseignez la référence distante pour rapprocher, sans recréer la salle");
      if(activeOperation(e)||!["DRAFT","CREATE_REJECTED","SYNC_UNKNOWN","PUBLISHING"].includes(e.status)) throw new DealPmeError(ErrorCode.INVALID_TRANSITION,"Publication en cours ou événement fermé ; actualisez son état");
      if(e.integrationMode!=="DEALPME_FIRST"||e.endsAt.getTime()<=Date.now()) throw new DealPmeError(ErrorCode.INVALID_TRANSITION,"Mode non qualifié ou événement terminé");
      const env=loadEnv();
      await reserveSharedEvent(tx,{accountKey:env.REMO_ACCOUNT_KEY,productKey:"dealpme",resourceId:id,startsAt:e.startsAt,endsAt:e.endsAt,limit:env.REMO_MAX_CONCURRENT,marginMinutes:env.REMO_MARGIN_MINUTES,provider:this.bridge.provider,...(this.bridge.provider==="remo"?{externalAccountId:env.REMO_COMPANY_ID,qualificationRef:env.REMO_QUOTA_REFERENCE}:{})});
      const next={...e,publicationKey:e.publicationKey??newId(),status:"PUBLISHING",revision:e.revision+1,syncStartedAt:new Date(),provider:this.bridge.provider,syncError:null};
      await tx.update(events).set({publicationKey:next.publicationKey,status:next.status,revision:next.revision,syncStartedAt:next.syncStartedAt,provider:next.provider,syncError:null,providerAccountKey:env.REMO_ACCOUNT_KEY,providerCompanyId:this.bridge.provider==="remo"?env.REMO_COMPANY_ID??null:null}).where(eq(events.id,id));
      await this.audit.record({action:"DEAL_TRANSITION",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{status:"PUBLISHING",operationKey:next.publicationKey}},tx);
      return next;
    });
    if(prepared.status==="PUBLISHED") return {eventId:id,remoEventId:prepared.remoEventId,status:prepared.status};
    try {
      const result=await this.bridge.publishToRemo(toProvider(prepared));
      await withTenant(this.db,organiser,async(tx)=>{
        const e=await this.owned(tx,id,organiser);
        if(e.revision!==prepared.revision) throw new DealPmeError(ErrorCode.CONFLICT,"Une opération plus récente a remplacé cette publication");
        await tx.update(events).set({remoEventId:result.remoEventId!,status:"PUBLISHED",syncError:null,syncStartedAt:null}).where(eq(events.id,id));
        await tx.update(eventReservations).set({state:"CONFIRMED",providerRef:result.remoEventId!}).where(and(eq(eventReservations.productKey,"dealpme"),eq(eventReservations.resourceId,id)));
        await this.audit.record({action:"DEAL_TRANSITION",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{status:"PUBLISHED",provider:this.bridge.provider}},tx);
      });
      return {eventId:id,remoEventId:result.remoEventId,status:"PUBLISHED"};
    } catch(error) {
      const rejected=this.bridge.provider==="remo"&&error instanceof RemoError&&["AUTHENTICATION","FORBIDDEN","RATE_LIMITED","REJECTED","NOT_FOUND"].includes(error.code);
      await withTenant(this.db,organiser,async(tx)=>{
        const rows=await tx.update(events).set({status:rejected?"CREATE_REJECTED":"SYNC_UNKNOWN",syncError:error instanceof RemoError?error.code:"COMMIT_UNKNOWN",syncStartedAt:null}).where(and(eq(events.id,id),eq(events.revision,prepared.revision),eq(events.status,"PUBLISHING"))).returning({id:events.id});
        if(rows.length) { await tx.update(eventReservations).set({state:rejected?"RESERVED":"UNKNOWN"}).where(and(eq(eventReservations.productKey,"dealpme"),eq(eventReservations.resourceId,id))); await this.audit.record({action:"DEAL_TRANSITION",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"FAILED",correlationId,metadata:{status:rejected?"CREATE_REJECTED":"SYNC_UNKNOWN"}},tx); }
      });
      if(rejected) throw new DealPmeError(ErrorCode.CONFLICT,"Remo a refusé la création : corrigez les paramètres ou les droits, puis réessayez la publication. Le brouillon peut aussi être annulé.");
      throw new DealPmeError(ErrorCode.CONFLICT,"Synchronisation indéterminée : le créneau reste réservé. Rapprochez la publication avec la même référence.");
    }
  }
  async cancel(id:string,reason:string,organiser:Principal,correlationId:string,deleteRemoteData=false) {
    const e=await withTenant(this.db,organiser,async(tx)=>{
      const row=await this.owned(tx,id,organiser);
      if(row.status==="CANCELLED") return row;
      const knownNotCreated=row.status==="CREATE_REJECTED";
      if(row.provider==="remo" && row.publicationKey&&!knownNotCreated) this.bridge.assertRemoteAccount(row);
      if(row.publicationKey && row.provider!==this.bridge.provider&&!knownNotCreated) throw new DealPmeError(ErrorCode.CONFLICT,"Réactivez le fournisseur de cet événement avant l'annulation distante");
      if(row.provider==="remo" && row.publicationKey&&!knownNotCreated && (!deleteRemoteData || !row.remoEventId)) throw new DealPmeError(ErrorCode.CONFLICT,"La suppression Remo efface la salle et ses données. Rapprochez d'abord sa référence puis utilisez l'action de suppression distante explicite.");
      if(activeOperation(row)) throw new DealPmeError(ErrorCode.CONFLICT,"Opération en cours ; actualisez avant annulation");
      await tx.update(events).set({status:"CANCEL_PENDING",syncStartedAt:new Date(),cancellationReason:reason,revision:row.revision+1,...(knownNotCreated?{publicationKey:null}:{})}).where(eq(events.id,id));
      await this.audit.record({action:"DEAL_TRANSITION",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{status:"CANCEL_PENDING",previousPublicationKey:row.publicationKey,knownNotCreated}},tx);
      return knownNotCreated?{...row,publicationKey:null}:row;
    });
    if(e.status==="CANCELLED") return {status:"CANCELLED"};
    try { if(e.publicationKey) { if(e.provider==="remo") await this.bridge.remote!.getEvent(e.remoEventId!); await this.bridge.cancel(e.provider==="remo"?e.remoEventId!:e.publicationKey); } }
    catch { await withTenant(this.db,organiser,async(tx)=>{await tx.update(events).set({syncError:"CANCEL_UNKNOWN",syncStartedAt:null}).where(eq(events.id,id));}); throw new DealPmeError(ErrorCode.CONFLICT,"Annulation distante non confirmée : réservation conservée, réessayez"); }
    await withTenant(this.db,organiser,async(tx)=>{
      await this.owned(tx,id,organiser);
      await tx.update(events).set({status:"CANCELLED",syncStartedAt:null,syncError:null}).where(eq(events.id,id));
      await tx.update(eventReservations).set({state:"RELEASED"}).where(and(eq(eventReservations.productKey,"dealpme"),eq(eventReservations.resourceId,id)));
      await tx.update(diasporaAppointments).set({status:"CANCELLED",decisionReason:reason}).where(eq(diasporaAppointments.eventId,id));
      await this.audit.record({action:"DEAL_TRANSITION",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{status:"CANCELLED"}},tx);
    }); return {status:"CANCELLED"};
  }
  async listPublished(principal:Principal|null) {
    return withTenant(this.db,principal,async(tx)=>{
      const rows=await tx.select().from(events).where(and(eq(events.status,"PUBLISHED"),eq(events.audience,"PUBLIC"))).orderBy(asc(events.startsAt));
      if(!rows.length) return {items:[]};
      const counts=await tx.execute<{event_id:string;n:number}>(sql`select * from event_registration_counts()`);
      const mine=principal?await tx.select().from(eventRegistrations).where(and(inArray(eventRegistrations.eventId,rows.map(r=>r.id)),eq(eventRegistrations.userId,principal.userId),isNull(eventRegistrations.cancelledAt))):[];
      return {items:rows.map(e=>{
        const reg=mine.find(r=>r.eventId===e.id),taken=Number(counts.find(r=>r.event_id===e.id)?.n??0);
        return {id:e.id,title:e.title,description:e.description,startsAt:e.startsAt,endsAt:e.endsAt,capacity:e.capacity,registered:taken,seatsLeft:Math.max(0,e.capacity-taken),campaignId:e.campaignId,integrationMode:e.integrationMode,branding:e.branding,provider:e.provider,simulated:e.provider==="local"||e.provider==="legacy",liveReady:e.provider===this.bridge.provider&&["local","remo"].includes(e.provider)&&!!e.remoEventId,ended:e.endsAt.getTime()<=Date.now(),myRegistration:reg?{displayName:reg.displayName,consentContact:!!reg.consentContactAt,invitationState:reg.invitationState,providerConsent:!!reg.providerConsentAt}:null};
      })};
    });
  }
  async register(id:string,participant:Principal,displayName:string,consentContact:boolean,correlationId:string,providerConsent=false) {
    try { return await withTenant(this.db,participant,async(tx)=>{
      const e=(await tx.select().from(events).where(and(eq(events.id,id),eq(events.status,"PUBLISHED"),eq(events.audience,"PUBLIC"))).limit(1))[0];
      if(!e) throw new DealPmeError(ErrorCode.NOT_FOUND,"Événement introuvable");
      if(e.provider==="remo" && !providerConsent) throw new DealPmeError(ErrorCode.VALIDATION_FAILED,"L'inscription à cette salle Remo requiert l'envoi de votre email pour son invitation");
      const registrationId=newId();
      await tx.insert(eventRegistrations).values({id:registrationId,eventId:id,userId:participant.userId,displayName,consentContactAt:consentContact?new Date():null,providerConsentAt:providerConsent?new Date():null});
      await this.audit.record({action:"EVENT_REGISTERED",actorUserId:participant.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{campaignId:e.campaignId,consentContact}},tx);
      return {registrationId,campaignId:e.campaignId};
    }); } catch(error) {
      const cause=(error as {cause?:{code?:string}}).cause;
      if(cause?.code==="23505"||cause?.code==="23514") throw new DealPmeError(ErrorCode.CONFLICT,"Événement complet, terminé ou inscription déjà enregistrée");
      throw error;
    }
  }
  async setContactConsent(id:string,participant:Principal,consent:boolean,correlationId:string) {
    await withTenant(this.db,participant,async(tx)=>{
      const rows=await tx.update(eventRegistrations).set({consentContactAt:consent?new Date():null}).where(and(eq(eventRegistrations.eventId,id),eq(eventRegistrations.userId,participant.userId))).returning({id:eventRegistrations.id});
      if(!rows.length) throw new DealPmeError(ErrorCode.NOT_FOUND,"Inscription introuvable");
      await this.audit.record({action:"EVENT_CONSENT_CHANGED",actorUserId:participant.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{consent}},tx);
    });
  }
  async joinUrl(id:string,participant:Principal,correlationId:string) {
    const preliminary=await withTenant(this.db,participant,async tx=>(await tx.select().from(events).where(eq(events.id,id)).limit(1))[0]);
    if(preliminary?.provider==="remo" && this.bridge.remote) {
      this.bridge.assertRemoteAccount(preliminary);
      if(preliminary.organiserUserId!==participant.userId) {
        const registered=await withTenant(this.db,participant,async tx=>(await tx.select({id:eventRegistrations.id}).from(eventRegistrations).where(and(eq(eventRegistrations.eventId,id),eq(eventRegistrations.userId,participant.userId),isNull(eventRegistrations.cancelledAt))).limit(1))[0]);
        if(!registered) throw new DealPmeError(ErrorCode.NOT_FOUND,"Inscription introuvable");
      }
      if(preliminary.status!=="PUBLISHED"||!preliminary.remoEventId||Date.now()<preliminary.startsAt.getTime()-900000||Date.now()>preliminary.endsAt.getTime()) throw new DealPmeError(ErrorCode.CONFLICT,"Salle fermée ou hors créneau");
      const remote=await this.bridge.remote.getEvent(preliminary.remoEventId);
      if(!remote.isPrivate) throw new DealPmeError(ErrorCode.CONFLICT,"La salle Remo n'est plus sur invitation ; rapprochez ses paramètres");
      if(preliminary.organiserUserId===participant.userId) {
        const user=(await this.db.select({email:users.email}).from(users).where(eq(users.id,participant.userId)).limit(1))[0];
        if(!user||user.email.toLowerCase()!==loadEnv().REMO_HOST_EMAIL?.toLowerCase()) throw new DealPmeError(ErrorCode.CONFLICT,"Le rôle hôte Remo doit être provisionné pour cet organisateur");
      } else await this.members.ensureInvitation(id,participant.userId,participant,correlationId);
      await withTenant(this.db,participant,async tx=>{await this.audit.record({action:"PRIVILEGED_ACCESS_USED",actorUserId:participant.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{operation:"REMO_LOGIN",provider:"remo"}},tx);});
      return {joinUrl:remote.joinUrl,simulated:false,accessMode:"REMO_LOGIN"};
    }
    return withTenant(this.db,participant,async(tx)=>{
      const e=(await tx.select().from(events).where(eq(events.id,id)).limit(1))[0];
      const reg=(await tx.select().from(eventRegistrations).where(and(eq(eventRegistrations.eventId,id),eq(eventRegistrations.userId,participant.userId),isNull(eventRegistrations.cancelledAt))).limit(1))[0];
      const host=e?.organiserUserId===participant.userId;
      if(!e||(!reg&&!host)) throw new DealPmeError(ErrorCode.NOT_FOUND,"Inscription introuvable");
      if(e.status!=="PUBLISHED"||e.provider!==this.bridge.provider||e.provider!=="local"||!e.publicationKey||!e.remoEventId) throw new DealPmeError(ErrorCode.CONFLICT,"Salle non disponible ou intégration historique non qualifiée");
      if(Date.now()<e.startsAt.getTime()-900000||Date.now()>e.endsAt.getTime()) throw new DealPmeError(ErrorCode.CONFLICT,"La salle ouvre quinze minutes avant le début et ferme à la fin du créneau");
      const joinUrl=await this.bridge.joinUrl(toProvider(e),participant.userId,reg?.displayName??"Organisateur");
      await this.audit.record({action:"PRIVILEGED_ACCESS_USED",actorUserId:participant.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{operation:"ADMISSION",provider:e.provider}},tx);
      return {joinUrl,simulated:true,expiresInSeconds:90};
    });
  }
  async syncAttendance(id:string,organiser:Principal,correlationId:string) {
    const e=await withTenant(this.db,organiser,tx=>this.owned(tx,id,organiser));
    if(!e.remoEventId||e.provider!==this.bridge.provider) throw new DealPmeError(ErrorCode.CONFLICT,"Présence non disponible pour cette intégration");
    if(this.bridge.remote) {
      this.bridge.assertRemoteAccount(e);
      const roster=await this.bridge.remote.attendees(e.remoEventId);
      return withTenant(this.db,organiser,async tx=>{
        let matched=0;
        const registrations=await tx.select().from(eventRegistrations).where(and(eq(eventRegistrations.eventId,id),isNull(eventRegistrations.cancelledAt)));
        for(const reg of registrations) {
          const entry=roster.find(a=>reg.providerEmail && a.email.toLowerCase()===reg.providerEmail && !a.blocked && a.joinedAt);
          if(!entry?.joinedAt || Date.parse(entry.joinedAt)<e.startsAt.getTime()-900000 || Date.parse(entry.joinedAt)>e.endsAt.getTime()+900000) continue;
          await tx.update(eventRegistrations).set({joinedAt:new Date(Math.min(reg.joinedAt?.getTime()??Infinity,Date.parse(entry.joinedAt)))}).where(eq(eventRegistrations.id,reg.id)); matched++;
        }
        await this.audit.record({action:"PRIVILEGED_ACCESS_USED",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{operation:"REMO_ATTENDANCE",matched}},tx);
        return {received:roster.length,matched};
      });
    }
    const data=await this.bridge.attendance(e.remoEventId);
    await withTenant(this.db,organiser,async(tx)=>{await this.bridge.ingestAttendance(JSON.stringify({events:data}),"",correlationId,tx);});
    return {received:data.length};
  }

  async reconcileRemote(id:string,remoteId:string,organiser:Principal,correlationId:string) {
    if(!this.bridge.remote) throw new DealPmeError(ErrorCode.CONFLICT,"Rapprochement Remo indisponible");
    const current=await withTenant(this.db,organiser,tx=>this.owned(tx,id,organiser));
    this.bridge.assertRemoteAccount(current);
    const remote=await this.bridge.remote.getEvent(remoteId);
    return withTenant(this.db,organiser,async tx=>{
      const e=await this.owned(tx,id,organiser);
      if(e.provider!=="remo" || !["SYNC_UNKNOWN","PUBLISHING"].includes(e.status) || activeOperation(e)) throw new DealPmeError(ErrorCode.CONFLICT,"Événement non disponible pour rapprochement");
      if(remote.code!==`dealpme-${e.publicationKey}`||remote.title!==e.title||remote.startsAt!==e.startsAt.toISOString()||remote.endsAt!==e.endsAt.toISOString()||!remote.isPrivate) throw new DealPmeError(ErrorCode.CONFLICT,"La référence ne correspond pas au compte, au code, au créneau et à la visibilité attendus");
      await tx.update(events).set({remoEventId:remoteId,status:"PUBLISHED",syncError:null,syncStartedAt:null}).where(eq(events.id,id));
      await tx.update(eventReservations).set({state:"CONFIRMED",providerRef:remoteId}).where(and(eq(eventReservations.productKey,"dealpme"),eq(eventReservations.resourceId,id)));
      await this.audit.record({action:"DEAL_TRANSITION",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{operation:"REMO_RECONCILED",remoteId}},tx);
      return {eventId:id,status:"PUBLISHED"};
    });
  }

  async updateRemoteContent(id:string,input:{expectedRevision:number;title:string;description?:string|undefined;branding:CreateEventInput["branding"]},actor:Principal,correlationId:string) {
    if(!this.bridge.remote) throw new DealPmeError(ErrorCode.CONFLICT,"Modification Remo indisponible");
    let remoteAttempted=false;
    try { return await withTenant(this.db,actor,async tx=>{
      const e=await this.owned(tx,id,actor);
      this.bridge.assertRemoteAccount(e);
      if(e.provider!=="remo"||e.status!=="PUBLISHED"||!e.remoEventId||e.revision!==input.expectedRevision) throw new DealPmeError(ErrorCode.CONFLICT,"Actualisez l'événement avant modification");
      // PUT de contenu rejouable ; aucun changement de créneau/capacité hors registre des réservations.
      remoteAttempted=true;
      await this.bridge.remote!.updateEvent(e.remoEventId,input);
      await tx.update(events).set({title:input.title,description:input.description??"",branding:input.branding,brandingOrigin:{scope:"EVENT",version:`event-${e.revision+1}`},revision:e.revision+1,syncError:null}).where(eq(events.id,id));
      await this.audit.record({action:"DEAL_TRANSITION",actorUserId:actor.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{operation:"REMO_CONTENT_UPDATED"}},tx);
      return {eventId:id};
    }); } catch(error) {
      if(remoteAttempted) await withTenant(this.db,actor,async tx=>{
        await tx.update(events).set({syncError:"UPDATE_UNKNOWN"}).where(and(eq(events.id,id),eq(events.organiserUserId,actor.userId),eq(events.revision,input.expectedRevision)));
        await this.audit.record({action:"DEAL_TRANSITION",actorUserId:actor.userId,subjectType:"event",subjectId:id,outcome:"FAILED",correlationId,metadata:{operation:"REMO_CONTENT_UPDATE_UNKNOWN"}},tx);
      });
      if(remoteAttempted) throw new DealPmeError(ErrorCode.CONFLICT,"Modification distante non confirmée. Vos saisies sont conservées ; réappliquez-les pour rapprocher le contenu.");
      throw error;
    }
  }
  async requestAppointment(investor:Principal,requestedSlot:string,dealId:string|null,acknowledged:boolean,correlationId:string,providerConsent=false) {
    if(!acknowledged||Date.parse(requestedSlot)<=Date.now()) throw new DealPmeError(ErrorCode.VALIDATION_FAILED,"Reconnaissez l'avis transfrontalier et choisissez un créneau futur");
    if(this.bridge.provider==="remo"&&!providerConsent) throw new DealPmeError(ErrorCode.VALIDATION_FAILED,"L'entretien Remo nécessite votre accord pour l'invitation par email");
    const id=newId();
    await withTenant(this.db,investor,async(tx)=>{
      if(dealId&&!(await tx.select({id:deals.id}).from(deals).where(and(eq(deals.id,dealId),inArray(deals.status,["LISTED_OPEN","LISTED_RESTRICTED","ENGAGED","DUE_DILIGENCE","NEGOTIATION"]))).limit(1))[0]) throw new DealPmeError(ErrorCode.NOT_FOUND,"Opportunité introuvable");
      await tx.insert(diasporaAppointments).values({id,investorUserId:investor.userId,dealId,requestedSlot:new Date(requestedSlot),crossBorderNoticeShownAt:new Date(),providerConsentAt:providerConsent?new Date():null});
      await this.audit.record({action:"INTEREST_EXPRESSED",actorUserId:investor.userId,subjectType:"diaspora_appointment",subjectId:id,outcome:"OK",correlationId},tx);
    }); return {appointmentId:id,status:"REQUESTED"};
  }
  async appointments(principal:Principal,managed=false) {
    return withTenant(this.db,principal,async(tx)=>({items:await tx.select().from(diasporaAppointments).where(managed?undefined:eq(diasporaAppointments.investorUserId,principal.userId)).orderBy(desc(diasporaAppointments.createdAt)).limit(100)}));
  }
  async decideAppointment(id:string,decision:"CONFIRM"|"REFUSE",reason:string,officer:Principal,correlationId:string) {
    const eventId=await withTenant(this.db,officer,async(tx)=>{
      const a=(await tx.select().from(diasporaAppointments).where(eq(diasporaAppointments.id,id)).for("update").limit(1))[0];
      if(!a) throw new DealPmeError(ErrorCode.NOT_FOUND,"Rendez-vous introuvable");
      if(a.confirmedBy&&a.confirmedBy!==officer.userId) throw new DealPmeError(ErrorCode.FORBIDDEN,"Instruction déjà attribuée à un autre officier");
      if(!["REQUESTED","CONFIRMING"].includes(a.status)) throw new DealPmeError(ErrorCode.CONFLICT,"Rendez-vous déjà instruit");
      if(decision==="REFUSE") {
        if(a.eventId) throw new DealPmeError(ErrorCode.CONFLICT,"Annulez la salle réservée avant de clôturer ce rendez-vous");
        await tx.update(diasporaAppointments).set({status:"REFUSED",confirmedBy:officer.userId,decisionReason:reason}).where(eq(diasporaAppointments.id,id));
      } else if(!a.eventId) {
        if(this.bridge.provider==="remo"&&!a.providerConsentAt) throw new DealPmeError(ErrorCode.CONFLICT,"Accord du demandeur pour l'invitation Remo requis ; demander une nouvelle proposition");
        if(a.requestedSlot.getTime()<=Date.now()) throw new DealPmeError(ErrorCode.CONFLICT,"Créneau dépassé : demander une nouvelle proposition");
        const eventId=newId();
        await tx.insert(events).values({id:eventId,title:"Entretien Guichet Diaspora",startsAt:a.requestedSlot,endsAt:new Date(a.requestedSlot.getTime()+1800000),capacity:2,organiserUserId:officer.userId,audience:"DIASPORA",provider:this.bridge.provider});
        await tx.update(diasporaAppointments).set({status:"CONFIRMING",eventId,confirmedBy:officer.userId,decisionReason:reason}).where(eq(diasporaAppointments.id,id));
        await this.audit.record({action:"DEAL_TRANSITION",actorUserId:officer.userId,subjectType:"diaspora_appointment",subjectId:id,outcome:"OK",correlationId,metadata:{decision,eventId}},tx);
        return eventId;
      }
      await this.audit.record({action:"DEAL_TRANSITION",actorUserId:officer.userId,subjectType:"diaspora_appointment",subjectId:id,outcome:"OK",correlationId,metadata:{decision}},tx);
      return a.eventId;
    });
    if(decision==="REFUSE") return {status:"REFUSED"};
    await this.publish(eventId!,officer,correlationId);
    await withTenant(this.db,officer,async(tx)=>{
      const a=(await tx.select().from(diasporaAppointments).where(eq(diasporaAppointments.id,id)).for("update"))[0]!;
      if(a.status!=="CONFIRMING") throw new DealPmeError(ErrorCode.CONFLICT,"Rendez-vous modifié pendant la publication");
      await tx.insert(eventRegistrations).values({id:newId(),eventId:eventId!,userId:a.investorUserId,displayName:"Participant diaspora",providerConsentAt:a.providerConsentAt}).onConflictDoNothing();
      await tx.update(diasporaAppointments).set({status:"CONFIRMED"}).where(eq(diasporaAppointments.id,id));
      await this.audit.record({action:"DEAL_TRANSITION",actorUserId:officer.userId,subjectType:"diaspora_appointment",subjectId:id,outcome:"OK",correlationId,metadata:{status:"CONFIRMED"}},tx);
    }); return {status:"CONFIRMED",eventId};
  }

  options() { return {provider:this.bridge.provider,providerEmailRequired:this.bridge.provider==="remo",ssoEnabled:loadEnv().REMO_SSO_ENABLED}; }

  async integration(actor:Principal) {
    const env=loadEnv();
    const account=await withTenant(this.db,actor,async tx=>(await tx.select().from(eventProviderAccounts).where(eq(eventProviderAccounts.key,env.REMO_ACCOUNT_KEY)).limit(1))[0]);
    return { ...this.options(), accountKey:env.REMO_ACCOUNT_KEY, companyId:env.REMO_COMPANY_ID??null, concurrentLimit:env.REMO_MAX_CONCURRENT, quotaReference:env.REMO_QUOTA_REFERENCE??"SIMULATION", brandRevision:account?.brandRevision??0,
      branding:account?.branding??{label:env.REMO_ACCOUNT_BRAND_LABEL,accent:env.REMO_ACCOUNT_BRAND_ACCENT,welcome:env.REMO_ACCOUNT_BRAND_WELCOME}, canEditDefaults:actor.roles.includes("PLATFORM_ADMIN")&&this.bridge.provider!=="disabled",
      saml:env.REMO_SSO_ENABLED?{idpEntityId:env.REMO_SAML_IDP_ENTITY_ID,ssoUrl:env.REMO_SAML_SSO_URL,spEntityId:env.REMO_SAML_SP_ENTITY_ID,acsUrl:env.REMO_SAML_ACS_URL}:null,
      capabilities:{events:true,members:true,attendance:true,groups:"EXISTING_GROUPS_ONLY",globalWhiteLabel:"INITIAL_PROVIDER_SETUP",ssoConfiguration:"INITIAL_PROVIDER_SETUP",recordingDownload:"NOT_IN_PUBLIC_API"}};
  }

  async updateAccountBranding(branding:CreateEventInput["branding"],expectedRevision:number,actor:Principal,correlationId:string) {
    const env=loadEnv();
    if(this.bridge.provider==="disabled") throw new DealPmeError(ErrorCode.CONFLICT,"Sélectionnez le compte fournisseur avant de modifier son profil");
    await withTenant(this.db,actor,async tx=>{
      await tx.insert(eventProviderAccounts).values({key:env.REMO_ACCOUNT_KEY,provider:this.bridge.provider,externalAccountId:this.bridge.provider==="remo"?env.REMO_COMPANY_ID??null:null,qualificationRef:env.REMO_QUOTA_REFERENCE??"SIMULATION",concurrentLimit:env.REMO_MAX_CONCURRENT,marginMinutes:env.REMO_MARGIN_MINUTES,brandRevision:0}).onConflictDoNothing();
      const account=(await tx.select().from(eventProviderAccounts).where(eq(eventProviderAccounts.key,env.REMO_ACCOUNT_KEY)).for("update"))[0]!;
      if(account.provider!==this.bridge.provider || account.externalAccountId!==(this.bridge.provider==="remo"?env.REMO_COMPANY_ID??null:null)) throw new DealPmeError(ErrorCode.CONFLICT,"Ce profil appartient à une autre configuration de compte fournisseur");
      if(account.brandRevision!==expectedRevision) throw new DealPmeError(ErrorCode.CONFLICT,"Profil global modifié ; actualisez");
      await tx.update(eventProviderAccounts).set({branding,brandRevision:account.brandRevision+1}).where(eq(eventProviderAccounts.key,env.REMO_ACCOUNT_KEY));
      await this.audit.record({action:"DEAL_TRANSITION",actorUserId:actor.userId,subjectType:"event_provider_account",subjectId:env.REMO_ACCOUNT_KEY,outcome:"OK",correlationId,metadata:{operation:"BRANDING_DEFAULTS_UPDATED",revision:account.brandRevision+1}},tx);
    });
    return {updated:true};
  }
}
