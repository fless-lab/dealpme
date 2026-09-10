import { Body, Controller, Get, HttpCode, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { IdSchema } from "@dealpme/contracts";
import { Role } from "@dealpme/domain";
import { CurrentPrincipal, OptionalPrincipal, Roles, type Principal } from "../../platform/auth.js";
import { correlationIdOf } from "../../platform/correlation-id.middleware.js";
import { validate } from "../../platform/zod.pipe.js";
import { EventsService } from "./events.service.js";

const CreateEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(4000).optional(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  capacity: z.number().int().positive().max(5000).default(100),
  mode: z.enum(["DEALPME_FIRST", "REMO_FIRST"]).default("DEALPME_FIRST"),
  campaignId: z.string().max(64).optional(),
});
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
  @Roles(Role.SELLER, Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.ADVISOR, Role.BANK)
  join(@Param("eventId", validate(IdSchema)) eventId: string, @CurrentPrincipal() participant: Principal) {
    return this.events.joinUrl(eventId, participant);
  }

  @Post("diaspora/appointments")
  @HttpCode(201)
  @Roles(Role.INVESTOR_DIASPORA, Role.INVESTOR)
  appointment(@Body(validate(AppointmentSchema)) body: z.infer<typeof AppointmentSchema>, @CurrentPrincipal() investor: Principal, @Req() req: Request) {
    return this.events.requestAppointment(investor, body.requestedSlot, body.dealId, body.crossBorderNoticeAcknowledged, correlationIdOf(req));
  }
}
