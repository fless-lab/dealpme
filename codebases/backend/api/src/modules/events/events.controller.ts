import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { IdSchema } from "@dealpme/contracts";
import { Role } from "@dealpme/domain";
import { CurrentPrincipal, OptionalPrincipal, Roles, type Principal } from "../../platform/auth.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { validate } from "../../platform/zod.pipe.js";
import { EventsService } from "./events.service.js";
import { CreateEventSchema, UpdateEventSchema } from "./event.schemas.js";
import { BrandingSchema } from "@dealpme/connector-remo";
import { RemoMembersService } from "./remo-members.service.js";
import { EventPageSchema,type EventPage } from "./event-page.js";

const ReasonSchema=z.object({reason:z.string().trim().min(3).max(2000),deleteRemoteData:z.boolean().default(false)});
const ReconcileSchema=z.object({remoteId:z.string().regex(/^[a-f0-9]{24}$/i)});
const RemoteContentSchema=z.object({expectedRevision:z.number().int().positive(),title:z.string().trim().min(3).max(200),description:z.string().max(4000).optional(),branding:BrandingSchema});
const GroupSchema=z.object({registrationId:IdSchema,code:z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/),add:z.boolean()});
const AccountBrandSchema=z.object({branding:BrandingSchema,expectedRevision:z.number().int().nonnegative()});
const InvitationBatchSchema=z.object({cursor:z.uuid().optional(),limit:z.number().int().min(1).max(20).default(20)});
const AppointmentDecisionSchema=ReasonSchema.extend({decision:z.enum(["CONFIRM","REFUSE"])});
const RegisterSchema = z.object({ displayName: z.string().min(2).max(120), consentContact: z.boolean().default(false), providerConsent:z.boolean().default(false) });
const ConsentSchema = z.object({ consentContact: z.boolean() });
const AppointmentSchema = z.object({ requestId:z.uuid().optional(),requestedSlot: z.iso.datetime(), dealId: IdSchema.nullable().default(null), crossBorderNoticeAcknowledged: z.boolean(),providerConsent:z.boolean().default(false) });

@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService, private readonly members: RemoMembersService) {}

  @Get()
  list(@OptionalPrincipal() principal: Principal | null) {
    return this.events.listPublished(principal);
  }

  @Get("options")
  options() { return this.events.options(); }

  @Get("integration")
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  integration(@CurrentPrincipal() actor:Principal) { return this.events.integration(actor); }

  @Post("account-branding")
  @HttpCode(200)
  @Roles(Role.PLATFORM_ADMIN)
  accountBranding(@Body(validate(AccountBrandSchema)) body:z.infer<typeof AccountBrandSchema>,@CurrentPrincipal() actor:Principal,@Req() req:Request) { return this.events.updateAccountBranding(body.branding,body.expectedRevision,actor,correlationIdOf(req)); }

  @Get("managed")
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  managed(@CurrentPrincipal() principal:Principal,@Query(validate(EventPageSchema)) page:EventPage) { return this.events.managed(principal,page); }

  @Get("managed/:eventId")
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  detail(@Param("eventId",validate(IdSchema)) id:string,@CurrentPrincipal() principal:Principal) { return this.events.detail(id,principal); }

  @Post(":eventId/edit")
  @HttpCode(200)
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  edit(@Param("eventId",validate(IdSchema)) id:string,@Body(validate(UpdateEventSchema)) body:z.infer<typeof UpdateEventSchema>,@CurrentPrincipal() principal:Principal,@Req() req:Request) { return this.events.update(id,body,principal,correlationIdOf(req)); }

  @Post(":eventId/cancel")
  @HttpCode(200)
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  cancel(@Param("eventId",validate(IdSchema)) id:string,@Body(validate(ReasonSchema)) body:z.infer<typeof ReasonSchema>,@CurrentPrincipal() principal:Principal,@Req() req:Request) { return this.events.cancel(id,body.reason,principal,correlationIdOf(req),body.deleteRemoteData); }

  @Post(":eventId/reconcile")
  @HttpCode(200)
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  reconcile(@Param("eventId",validate(IdSchema)) id:string,@Body(validate(ReconcileSchema)) body:z.infer<typeof ReconcileSchema>,@CurrentPrincipal() principal:Principal,@Req() req:Request) { return this.events.reconcileRemote(id,body.remoteId,principal,correlationIdOf(req)); }

  @Post(":eventId/remote-content")
  @HttpCode(200)
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  remoteContent(@Param("eventId",validate(IdSchema)) id:string,@Body(validate(RemoteContentSchema)) body:z.infer<typeof RemoteContentSchema>,@CurrentPrincipal() principal:Principal,@Req() req:Request) { return this.events.updateRemoteContent(id,body,principal,correlationIdOf(req)); }

  @Post(":eventId/sync-invitations")
  @HttpCode(200)
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  invitations(@Param("eventId",validate(IdSchema)) id:string,@Body(validate(InvitationBatchSchema)) body:z.infer<typeof InvitationBatchSchema>,@CurrentPrincipal() principal:Principal,@Req() req:Request) { return this.members.synchronise(id,principal,correlationIdOf(req),body.cursor,body.limit); }

  @Post(":eventId/member-group")
  @HttpCode(200)
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  group(@Param("eventId",validate(IdSchema)) id:string,@Body(validate(GroupSchema)) body:z.infer<typeof GroupSchema>,@CurrentPrincipal() principal:Principal,@Req() req:Request) { return this.members.changeGroup(id,body.registrationId,body.code,body.add,principal,correlationIdOf(req)); }

  @Post(":eventId/invite-speaker")
  @HttpCode(200)
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  speaker(@Param("eventId",validate(IdSchema)) id:string,@Body(validate(GroupSchema.pick({registrationId:true}))) body:{registrationId:string},@CurrentPrincipal() principal:Principal,@Req() req:Request) { return this.members.inviteSpeaker(id,body.registrationId,principal,correlationIdOf(req)); }

  @Post(":eventId/sync-attendance")
  @HttpCode(200)
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  sync(@Param("eventId",validate(IdSchema)) id:string,@CurrentPrincipal() principal:Principal,@Req() req:Request) { return this.events.syncAttendance(id,principal,correlationIdOf(req)); }

  @Get("diaspora/appointments")
  @Roles(Role.INVESTOR,Role.INVESTOR_DIASPORA)
  mine(@CurrentPrincipal() principal:Principal,@Query(validate(EventPageSchema)) page:EventPage) { return this.events.appointments(principal,false,page); }

  @Get("diaspora/managed")
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  appointmentQueue(@CurrentPrincipal() principal:Principal,@Query(validate(EventPageSchema)) page:EventPage) { return this.events.appointments(principal,true,page); }

  @Post("diaspora/:appointmentId/decision")
  @HttpCode(200)
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  appointmentDecision(@Param("appointmentId",validate(IdSchema)) id:string,@Body(validate(AppointmentDecisionSchema)) body:z.infer<typeof AppointmentDecisionSchema>,@CurrentPrincipal() principal:Principal,@Req() req:Request) { return this.events.decideAppointment(id,body.decision,body.reason,principal,correlationIdOf(req)); }

  @Post()
  @HttpCode(201)
  @Roles(Role.CCI_OFFICER, Role.PLATFORM_ADMIN)
  create(@Body(validate(CreateEventSchema)) body: z.infer<typeof CreateEventSchema>, @CurrentPrincipal() organiser: Principal, @Req() req: Request) {
    return this.events.create(body, organiser, correlationIdOf(req));
  }

  @Post(":eventId/publish")
  @HttpCode(200)
  @Roles(Role.CCI_OFFICER, Role.PLATFORM_ADMIN)
  publish(@Param("eventId", validate(IdSchema)) eventId: string, @CurrentPrincipal() organiser: Principal, @Req() req: Request) {
    return this.events.publish(eventId, organiser, correlationIdOf(req));
  }

  @Post(":eventId/registrations")
  @HttpCode(201)
  @Roles(Role.SELLER, Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.ADVISOR, Role.BANK)
  register(@Param("eventId", validate(IdSchema)) eventId: string, @Body(validate(RegisterSchema)) body: z.infer<typeof RegisterSchema>, @CurrentPrincipal() participant: Principal, @Req() req: Request) {
    return this.events.register(eventId, participant, body.displayName, body.consentContact, correlationIdOf(req),body.providerConsent);
  }

  @Post(":eventId/contact-consent")
  @HttpCode(200)
  @Roles(Role.SELLER, Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.ADVISOR, Role.BANK)
  async consent(
    @Param("eventId", validate(IdSchema)) eventId: string,
    @Body(validate(ConsentSchema)) body: z.infer<typeof ConsentSchema>,
    @CurrentPrincipal() participant: Principal,
    @Req() req: Request,
  ) {
    await this.events.setContactConsent(eventId, participant, body.consentContact, correlationIdOf(req));
    return { consentContact: body.consentContact };
  }

  @Get(":eventId/join-url")
  @Roles(Role.SELLER, Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.ADVISOR, Role.BANK,Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  join(@Param("eventId", validate(IdSchema)) eventId: string, @CurrentPrincipal() participant: Principal,@Req() req:Request) {
    return this.events.joinUrl(eventId, participant,correlationIdOf(req));
  }

  @Post("diaspora/appointments")
  @HttpCode(201)
  @Roles(Role.INVESTOR_DIASPORA, Role.INVESTOR)
  appointment(@Body(validate(AppointmentSchema)) body: z.infer<typeof AppointmentSchema>, @CurrentPrincipal() investor: Principal, @Req() req: Request) {
    return this.events.requestAppointment(investor, body.requestedSlot, body.dealId, body.crossBorderNoticeAcknowledged, correlationIdOf(req),body.providerConsent,body.requestId);
  }
}
