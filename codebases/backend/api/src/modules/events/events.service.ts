import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { DealPmeError, ErrorCode } from "@dealpme/contracts";
import { newId } from "@dealpme/domain";
import { RemoError } from "@dealpme/connector-remo";
import { CORE_DB, type CoreDb } from "../../database/database.module.js";
import { diasporaAppointments, eventRegistrations, events, eventReservations, deals } from "../../database/schema/core.js";
import { withTenant, type CoreTx } from "../../database/tenant.js";
import { AuditService } from "../../platform/audit.service.js";
import type { Principal } from "../../platform/auth.js";
import { loadEnv } from "../../config/env.js";
import { RemoBridgeService, type DealPmeEvent, type RemoIntegrationMode } from "./remo-bridge.service.js";
import { reserveSharedEvent } from "./reservations.js";
import type { CreateEventInput } from "./event.schemas.js";

type Event = typeof events.$inferSelect;
const toProvider = (e: Event): DealPmeEvent => ({ id:e.id,title:e.title,startsAt:e.startsAt.toISOString(),endsAt:e.endsAt.toISOString(),capacity:e.capacity,mode:e.integrationMode as RemoIntegrationMode,publicationKey:e.publicationKey!,branding:e.branding,...(e.remoEventId?{remoEventId:e.remoEventId}:{}) });
const activeOperation = (e: Event) => ["PUBLISHING","CANCEL_PENDING"].includes(e.status) && !!e.syncStartedAt && e.syncStartedAt.getTime()>Date.now()-60000;

@Injectable()
export class EventsService {
  constructor(@Inject(CORE_DB) private readonly db: CoreDb, private readonly bridge: RemoBridgeService, private readonly audit: AuditService) {}
  private branding(input:CreateEventInput) { const env=loadEnv();return {branding:input.brandingSource==="ACCOUNT"?{label:env.REMO_ACCOUNT_BRAND_LABEL,accent:env.REMO_ACCOUNT_BRAND_ACCENT,welcome:env.REMO_ACCOUNT_BRAND_WELCOME}:input.branding,brandingOrigin:{scope:input.brandingSource,version:input.brandingSource==="ACCOUNT"?env.REMO_ACCOUNT_BRAND_VERSION:"event-v1"}}; }

  private async owned(tx: CoreTx, id: string, organiser: Principal) {
    const event=(await tx.select().from(events).where(and(eq(events.id,id),eq(events.organiserUserId,organiser.userId))).for("update").limit(1))[0];
    if(!event) throw new DealPmeError(ErrorCode.NOT_FOUND,"Événement introuvable dans votre espace organisateur");
    return event;
  }
  async create(input: CreateEventInput, organiser: Principal, correlationId: string) {
    if(input.mode!=="DEALPME_FIRST") throw new DealPmeError(ErrorCode.INVALID_TRANSITION,"REMO_FIRST attend la qualification de la synchronisation des inscriptions et billets");
    const id=input.requestId??newId(), creationHash=createHash("sha256").update(JSON.stringify({...input,requestId:undefined})).digest("hex");
    await withTenant(this.db,organiser,async(tx)=>{
      const inserted=await tx.insert(events).values({id,creationHash,title:input.title,description:input.description??null,startsAt:new Date(input.startsAt),endsAt:new Date(input.endsAt),capacity:input.capacity,integrationMode:input.mode,campaignId:input.campaignId??null,...this.branding(input),organiserUserId:organiser.userId,provider:this.bridge.provider}).onConflictDoNothing().returning({id:events.id});
      if(!inserted.length) { const prior=(await tx.select().from(events).where(and(eq(events.id,id),eq(events.organiserUserId,organiser.userId))).limit(1))[0]; if(!prior||prior.creationHash!==creationHash) throw new DealPmeError(ErrorCode.CONFLICT,"Clé de création déjà utilisée avec une autre requête"); return; }
      await this.audit.record({action:"DEAL_CREATED",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{mode:input.mode}},tx);
    });
    return {eventId:id};
  }
  async update(id:string,input:CreateEventInput & {expectedRevision:number},organiser:Principal,correlationId:string) {
    return withTenant(this.db,organiser,async(tx)=>{
      const e=await this.owned(tx,id,organiser);
      if(e.status!=="DRAFT"||e.revision!==input.expectedRevision||e.audience!=="PUBLIC") throw new DealPmeError(ErrorCode.CONFLICT,"Brouillon modifié ou déjà publié : actualisez avant de modifier");
      if(input.mode!=="DEALPME_FIRST") throw new DealPmeError(ErrorCode.INVALID_TRANSITION,"REMO_FIRST non qualifié");
      await tx.update(events).set({title:input.title,description:input.description??null,startsAt:new Date(input.startsAt),endsAt:new Date(input.endsAt),capacity:input.capacity,campaignId:input.campaignId??null,...this.branding(input),revision:e.revision+1}).where(eq(events.id,id));
      await this.audit.record({action:"DEAL_TRANSITION",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{operation:"EDIT",revision:e.revision+1}},tx);
      return {eventId:id};
    });
  }
  async managed(principal:Principal) {
    return withTenant(this.db,principal,async(tx)=>({items:await tx.select().from(events).where(eq(events.organiserUserId,principal.userId)).orderBy(desc(events.createdAt)).limit(100),provider:this.bridge.provider,account:{key:loadEnv().REMO_ACCOUNT_KEY,concurrentLimit:loadEnv().REMO_MAX_CONCURRENT,marginMinutes:loadEnv().REMO_MARGIN_MINUTES,qualification:"SIMULATION_LOCALE_NON_CONTRACTUELLE"}}));
  }
  async detail(id:string,principal:Principal) {
    return withTenant(this.db,principal,async(tx)=>{
      const event=await this.owned(tx,id,principal);
      const registrations=await tx.select({id:eventRegistrations.id,displayName:eventRegistrations.displayName,consentContactAt:eventRegistrations.consentContactAt,joinedAt:eventRegistrations.joinedAt,createdAt:eventRegistrations.createdAt}).from(eventRegistrations).where(and(eq(eventRegistrations.eventId,id),isNull(eventRegistrations.cancelledAt))).orderBy(asc(eventRegistrations.createdAt)).limit(5000);
      const reservations=await tx.select().from(eventReservations).where(and(eq(eventReservations.productKey,"dealpme"),eq(eventReservations.resourceId,id)));
      return {...event,registrations,reservation:reservations[0]??null};
    });
  }
  async publish(id:string,organiser:Principal,correlationId:string) {
    if(this.bridge.provider!=="local") throw new DealPmeError(ErrorCode.CONFLICT,"Fournisseur événementiel non qualifié ou désactivé");
    const prepared=await withTenant(this.db,organiser,async(tx)=>{
      const e=await this.owned(tx,id,organiser);
      if(e.status==="PUBLISHED") return e;
      if(activeOperation(e)||!["DRAFT","SYNC_UNKNOWN","PUBLISHING"].includes(e.status)) throw new DealPmeError(ErrorCode.INVALID_TRANSITION,"Publication en cours ou événement fermé ; actualisez son état");
      if(e.integrationMode!=="DEALPME_FIRST"||e.endsAt.getTime()<=Date.now()) throw new DealPmeError(ErrorCode.INVALID_TRANSITION,"Mode non qualifié ou événement terminé");
      const env=loadEnv();
      await reserveSharedEvent(tx,{accountKey:env.REMO_ACCOUNT_KEY,productKey:"dealpme",resourceId:id,startsAt:e.startsAt,endsAt:e.endsAt,limit:env.REMO_MAX_CONCURRENT,marginMinutes:env.REMO_MARGIN_MINUTES});
      const next={...e,publicationKey:e.publicationKey??newId(),status:"PUBLISHING",revision:e.revision+1,syncStartedAt:new Date(),provider:"local",syncError:null};
      await tx.update(events).set({publicationKey:next.publicationKey,status:next.status,revision:next.revision,syncStartedAt:next.syncStartedAt,provider:next.provider,syncError:null}).where(eq(events.id,id));
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
        await this.audit.record({action:"DEAL_TRANSITION",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{status:"PUBLISHED",provider:"local"}},tx);
      });
      return {eventId:id,remoEventId:result.remoEventId,status:"PUBLISHED"};
    } catch(error) {
      await withTenant(this.db,organiser,async(tx)=>{
        const rows=await tx.update(events).set({status:"SYNC_UNKNOWN",syncError:error instanceof RemoError?error.code:"COMMIT_UNKNOWN",syncStartedAt:null}).where(and(eq(events.id,id),eq(events.revision,prepared.revision),eq(events.status,"PUBLISHING"))).returning({id:events.id});
        if(rows.length) { await tx.update(eventReservations).set({state:"UNKNOWN"}).where(and(eq(eventReservations.productKey,"dealpme"),eq(eventReservations.resourceId,id))); await this.audit.record({action:"DEAL_TRANSITION",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"FAILED",correlationId,metadata:{status:"SYNC_UNKNOWN"}},tx); }
      });
      throw new DealPmeError(ErrorCode.CONFLICT,"Synchronisation indéterminée : le créneau reste réservé. Rapprochez la publication avec la même référence.");
    }
  }
  async cancel(id:string,reason:string,organiser:Principal,correlationId:string) {
    const e=await withTenant(this.db,organiser,async(tx)=>{
      const row=await this.owned(tx,id,organiser);
      if(row.status==="CANCELLED") return row;
      if(activeOperation(row)) throw new DealPmeError(ErrorCode.CONFLICT,"Opération en cours ; actualisez avant annulation");
      await tx.update(events).set({status:"CANCEL_PENDING",syncStartedAt:new Date(),cancellationReason:reason,revision:row.revision+1}).where(eq(events.id,id));
      await this.audit.record({action:"DEAL_TRANSITION",actorUserId:organiser.userId,subjectType:"event",subjectId:id,outcome:"OK",correlationId,metadata:{status:"CANCEL_PENDING"}},tx);
      return row;
    });
    if(e.status==="CANCELLED") return {status:"CANCELLED"};
    try { if(e.publicationKey) await this.bridge.cancel(e.publicationKey); }
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
        return {id:e.id,title:e.title,description:e.description,startsAt:e.startsAt,endsAt:e.endsAt,capacity:e.capacity,registered:taken,seatsLeft:Math.max(0,e.capacity-taken),campaignId:e.campaignId,integrationMode:e.integrationMode,branding:e.branding,simulated:e.provider==="local"||e.provider==="legacy",liveReady:e.provider===this.bridge.provider&&e.provider==="local"&&!!e.remoEventId,ended:e.endsAt.getTime()<=Date.now(),myRegistration:reg?{displayName:reg.displayName,consentContact:!!reg.consentContactAt}:null};
      })};
    });
  }
  async register(id:string,participant:Principal,displayName:string,consentContact:boolean,correlationId:string) {
    try { return await withTenant(this.db,participant,async(tx)=>{
      const e=(await tx.select().from(events).where(and(eq(events.id,id),eq(events.status,"PUBLISHED"),eq(events.audience,"PUBLIC"))).limit(1))[0];
      if(!e) throw new DealPmeError(ErrorCode.NOT_FOUND,"Événement introuvable");
      const registrationId=newId();
      await tx.insert(eventRegistrations).values({id:registrationId,eventId:id,userId:participant.userId,displayName,consentContactAt:consentContact?new Date():null});
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
    if(!e.remoEventId||e.provider!=="local") throw new DealPmeError(ErrorCode.CONFLICT,"Présence non disponible pour cette intégration");
    const data=await this.bridge.attendance(e.remoEventId);
    await withTenant(this.db,organiser,async(tx)=>{await this.bridge.ingestAttendance(JSON.stringify({events:data}),"",correlationId,tx);});
    return {received:data.length};
  }
  async requestAppointment(investor:Principal,requestedSlot:string,dealId:string|null,acknowledged:boolean,correlationId:string) {
    if(!acknowledged||Date.parse(requestedSlot)<=Date.now()) throw new DealPmeError(ErrorCode.VALIDATION_FAILED,"Reconnaissez l'avis transfrontalier et choisissez un créneau futur");
    const id=newId();
    await withTenant(this.db,investor,async(tx)=>{
      if(dealId&&!(await tx.select({id:deals.id}).from(deals).where(and(eq(deals.id,dealId),inArray(deals.status,["LISTED_OPEN","LISTED_RESTRICTED","ENGAGED","DUE_DILIGENCE","NEGOTIATION"]))).limit(1))[0]) throw new DealPmeError(ErrorCode.NOT_FOUND,"Opportunité introuvable");
      await tx.insert(diasporaAppointments).values({id,investorUserId:investor.userId,dealId,requestedSlot:new Date(requestedSlot),crossBorderNoticeShownAt:new Date()});
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
      await tx.insert(eventRegistrations).values({id:newId(),eventId:eventId!,userId:a.investorUserId,displayName:"Participant diaspora"}).onConflictDoNothing();
      await tx.update(diasporaAppointments).set({status:"CONFIRMED"}).where(eq(diasporaAppointments.id,id));
      await this.audit.record({action:"DEAL_TRANSITION",actorUserId:officer.userId,subjectType:"diaspora_appointment",subjectId:id,outcome:"OK",correlationId,metadata:{status:"CONFIRMED"}},tx);
    }); return {status:"CONFIRMED",eventId};
  }
}
