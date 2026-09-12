import { z } from "zod";
import { BrandingSchema } from "@dealpme/connector-remo";
export const CreateEventSchema = z.object({
  requestId: z.uuid().optional(),
  title: z.string().trim().min(3).max(200), description: z.string().max(4000).optional(),
  startsAt: z.iso.datetime(), endsAt: z.iso.datetime(), capacity: z.number().int().min(1).max(5000).default(100),
  mode: z.enum(["DEALPME_FIRST","REMO_FIRST"]).default("DEALPME_FIRST"), campaignId: z.string().max(64).optional(),
  branding: BrandingSchema.default({ label: "DealPME", accent: "#1C2751", welcome: "Bienvenue à cette rencontre" }),
  brandingSource: z.enum(["ACCOUNT","EVENT"]).default("EVENT"),
}).refine((v) => Date.parse(v.endsAt) > Date.parse(v.startsAt),"La fin doit suivre le début");
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export const UpdateEventSchema = CreateEventSchema.safeExtend({ expectedRevision: z.number().int().positive() });
