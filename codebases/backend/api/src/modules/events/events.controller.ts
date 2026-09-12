import { Body, Controller, Get, HttpCode, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { IdSchema } from "@dealpme/contracts";
import { Role } from "@dealpme/domain";
import { CurrentPrincipal, OptionalPrincipal, Roles, type Principal } from "../../platform/auth.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { validate } from "../../platform/zod.pipe.js";
import { EventsService } from "./events.service.js";
import { CreateEventSchema, UpdateEventSchema } from "./event.schemas.js";

const ReasonSchema=z.object({reason:z.string().trim().min(3).max(2000)});
const AppointmentDecisionSchema=ReasonSchema.extend({decision:z.enum(["CONFIRM","REFUSE"])});
const RegisterSchema = z.object({ displayName: z.string().min(2).max(120), consentContact: z.boolean().default(false) });
const ConsentSchema = z.object({ consentContact: z.boolean() });
const AppointmentSchema = z.object({ requestedSlot: z.iso.datetime(), dealId: IdSchema.nullable().default(null), crossBorderNoticeAcknowledged: z.boolean() });

@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@OptionalPrincipal() principal: Principal | null) {
    return this.events.listPublished(principal);
  }

  @Get("managed")
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  managed(@CurrentPrincipal() principal:Principal) { return this.events.managed(principal); }

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
  cancel(@Param("eventId",validate(IdSchema)) id:string,@Body(validate(ReasonSchema)) body:z.infer<typeof ReasonSchema>,@CurrentPrincipal() principal:Principal,@Req() req:Request) { return this.events.cancel(id,body.reason,principal,correlationIdOf(req)); }

  @Post(":eventId/sync-attendance")
  @HttpCode(200)
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  sync(@Param("eventId",validate(IdSchema)) id:string,@CurrentPrincipal() principal:Principal,@Req() req:Request) { return this.events.syncAttendance(id,principal,correlationIdOf(req)); }

  @Get("diaspora/appointments")
  @Roles(Role.INVESTOR,Role.INVESTOR_DIASPORA)
  mine(@CurrentPrincipal() principal:Principal) { return this.events.appointments(principal); }

  @Get("diaspora/managed")
  @Roles(Role.CCI_OFFICER,Role.PLATFORM_ADMIN)
  appointmentQueue(@CurrentPrincipal() principal:Principal) { return this.events.appointments(principal,true); }

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
    return this.events.register(eventId, participant, body.displayName, body.consentContact, correlationIdOf(req));
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
    return this.events.requestAppointment(investor, body.requestedSlot, body.dealId, body.crossBorderNoticeAcknowledged, correlationIdOf(req));
  }
}
