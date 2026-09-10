import { z } from "zod";

/**
 * Variables d'environnement validées au démarrage. Un secret manquant fait échouer le démarrage,
 * jamais un comportement par défaut silencieux en production.
 */
const bool = z
  .string()
  .default("false")
  .transform((v) => v === "true");

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().default(4000),
  APP_BASE_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL_CORE: z.string().min(1).refine((u) => !/^postgres:\/\/dealpme_core:/.test(u) || process.env["NODE_ENV"] === "test", {
    message: "L'API doit se connecter avec le rôle applicatif dealpme_api, pas avec le rôle propriétaire (RLS contournée)",
  }),
  DATABASE_URL_CORE_ADMIN: z.string().min(1).optional(),
  DATABASE_URL_VDR: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  RPS_BASE_URL: z.url().default("http://localhost:4100"),
  S3_ENDPOINT: z.string().min(1),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET_VDR: z.string().min(1),
  S3_BUCKET_IDENTITY: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  FIELD_ENCRYPTION_KEY: z.string().min(16),
  CONNECTOR_REGISTRY_MODE: z.enum(["api", "manual"]).default("manual"),
  CONNECTOR_SMS_PROVIDER: z.string().default("fake"),
  CONNECTOR_EMAIL_PROVIDER: z.string().default("mailpit"),
  CONNECTOR_REMO_API_KEY: z.string().default(""),
  CONNECTOR_REMO_WEBHOOK_SECRET: z.string().min(16).optional(),
  FEATURE_TRANSACTION_FEES: bool,
  FEATURE_LICENSED_PARTNER_HANDOFF: bool,
  FEATURE_BIOMETRIC_KYC: bool,
  FEATURE_SHARE_DEAL_LISTING: bool,
  FEATURE_DEALLENS: bool,
  RPS_DEFAULT_CIRCLE_CAP: z.coerce.number().int().positive().default(50),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuration invalide :\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
