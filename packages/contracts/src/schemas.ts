import { z } from "zod";
import {
  DealType,
  DisclosureTier,
  LegalForm,
  RegionCode,
  Role,
  TurnoverBand,
  CertificationDecision,
} from "@dealpme/domain";

const enumValues = <T extends Record<string, string>>(e: T) => Object.values(e) as [T[keyof T], ...T[keyof T][]];

export const IdSchema = z.uuid();
/** Téléphone au format E.164, indicatif par défaut +228 (Togo). */
export const PhoneE164Schema = z.string().regex(/^\+[1-9]\d{6,14}$/, "Numéro attendu au format E.164, par exemple +22890000000");
/** Montant XOF : entier positif, sans décimale. */
export const XofSchema = z.number().int().nonnegative();

// ---------------------------------------------------------------- identité (IDN)
export const RegisterRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(12, "12 caractères minimum"),
  phoneE164: PhoneE164Schema,
  organisationName: z.string().min(2).max(160),
  role: z.enum([Role.SELLER, Role.INVESTOR, Role.INVESTOR_DIASPORA, Role.ADVISOR]),
  consents: z.object({
    termsAccepted: z.literal(true),
    privacyAccepted: z.literal(true),
    marketingOptIn: z.boolean().default(false),
  }),
  attribution: z.object({
    channel: z.string().min(1).max(64),
    campaignId: z.string().max(64).nullable().default(null),
    referralCode: z.string().max(64).nullable().default(null),
  }),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const OtpVerifyRequestSchema = z.object({
  challengeId: IdSchema,
  code: z.string().regex(/^\d{6}$/),
});

// ---------------------------------------------------------------- marketplace (MKT)
/** Création d'un dossier : le type de cession est choisi à l'étape 1 et devient immuable (DP-MKT-010). */
export const CreateDealRequestSchema = z.object({
  companyId: IdSchema,
  dealType: z.enum(enumValues(DealType)),
  sectorCode: z.string().min(2).max(16),
  regionCode: z.enum(enumValues(RegionCode)),
  turnoverBand: z.enum(enumValues(TurnoverBand)),
});
export type CreateDealRequest = z.infer<typeof CreateDealRequestSchema>;

/** Représentation T0 : la seule autorisée en recherche et en liste (DP-MKT-012). */
export const DealTeaserT0Schema = z.object({
  id: IdSchema,
  dealType: z.enum(enumValues(DealType)),
  sectorCode: z.string(),
  regionCode: z.enum(enumValues(RegionCode)),
  turnoverBand: z.enum(enumValues(TurnoverBand)),
  isDealReady: z.boolean(),
  disclosureTier: z.literal(DisclosureTier.T0),
});
export type DealTeaserT0 = z.infer<typeof DealTeaserT0Schema>;

export const SearchDealsQuerySchema = z.object({
  sectorCode: z.string().optional(),
  regionCode: z.enum(enumValues(RegionCode)).optional(),
  turnoverBand: z.enum(enumValues(TurnoverBand)).optional(),
  dealReadyOnly: z.coerce.boolean().default(false),
  /** Pagination par curseur uniquement (jamais par offset) sur les collections de deals. */
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchDealsQuery = z.infer<typeof SearchDealsQuerySchema>;

export const CursorPageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });

// ---------------------------------------------------------------- institution (GOV / CCI)
export const MembershipConfirmationRequestSchema = z.object({
  organisationId: IdSchema,
  /** Référence de confirmation fournie par la CCI-Togo. La base des membres n'est jamais importée. */
  confirmationRef: z.string().min(3).max(64),
});

export const RegistryVerificationRequestSchema = z.object({
  companyId: IdSchema,
  rccmNumber: z.string().min(3).max(64),
  legalForm: z.enum(enumValues(LegalForm)),
});

export const CertificationDecisionRequestSchema = z.object({
  companyId: IdSchema,
  decision: z.enum([CertificationDecision.GRANTED, CertificationDecision.REFUSED, CertificationDecision.REVOKED]),
  scopeStatement: z.string().min(20),
  conflictOfInterestDeclared: z.literal(false, { error: "Un officier ayant déclaré un conflit d'intérêts ne peut pas décider." }),
  expiresAt: z.iso.datetime().optional(),
  reason: z.string().max(2000).optional(),
});
export type CertificationDecisionRequest = z.infer<typeof CertificationDecisionRequestSchema>;

// ---------------------------------------------------------------- évaluation indicative (P05)
export const IndicativeValuationRequestSchema = z.object({
  dealId: IdSchema,
  ebitdaXof: XofSchema,
  netDebtXof: z.number().int(),
  restatements: z.array(z.object({ label: z.string().min(1), amountXof: z.number().int(), justification: z.string().min(1) })).default([]),
});
export type IndicativeValuationRequest = z.infer<typeof IndicativeValuationRequestSchema>;
