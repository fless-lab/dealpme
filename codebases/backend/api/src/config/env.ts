import { z } from "zod";
import { resolveRegistryConfig } from "@dealpme/connector-registry";

/**
 * Variables d'environnement validées au démarrage. Un secret manquant fait échouer le démarrage,
 * jamais un comportement par défaut silencieux en production.
 */
const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().default(4000),
  APP_BASE_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL_CORE: z.string().min(1),
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
  S3_BUCKET_DOSSIER: z.string().min(1).default("dealpme-dossier"),
  SESSION_SECRET: z.string().min(16),
  FIELD_ENCRYPTION_KEY: z.string().min(16),
  FIELD_ENCRYPTION_KEY_ID: z.string().min(1).default("v1"),
  FIELD_ENCRYPTION_KEY_PREVIOUS: z.string().min(16).optional(),
  FIELD_ENCRYPTION_KEY_PREVIOUS_ID: z.string().min(1).optional(),
  CONNECTOR_REGISTRY_MODE: z.enum(["api", "manual"]).optional(),
  CFE_API_ENABLED: z.enum(["true", "false"]).optional(),
  CONNECTOR_REGISTRY_PROVIDER: z.enum(["mock", "cfe"]).default("mock"),
  CFE_API_BASE_URL: z.string().optional(),
  CFE_API_TIMEOUT_MS: z.string().optional(),
  CONNECTOR_ANTIVIRUS_MODE: z.enum(["clamav", "fake"]).default("fake"),
  CLAMAV_HOST: z.string().default("localhost"),
  CLAMAV_PORT: z.coerce.number().int().default(3310),
  DOSSIER_MAX_FILE_BYTES: z.coerce.number().int().positive().default(20 * 1024 * 1024),
  CONNECTOR_SMS_PROVIDER: z.enum(["fake", "local", "generic-http"]).default("local"),
  CONNECTOR_EMAIL_PROVIDER: z.enum(["fake", "mailpit", "smtp"]).default("mailpit"),
  SMTP_HOST: z.string().trim().min(1).default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  SMTP_SECURE: bool,
  SMTP_REQUIRE_TLS: bool,
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.email().default("notifications@demo.dealpme.local"),
  SMS_LOCAL_BASE_URL: z.url().default("http://127.0.0.1:8026"),
  SMS_LOCAL_API_KEY: z.string().min(1).default("dealpme-local-sms"),
  SMS_HTTP_BASE_URL: z.string().optional(),
  SMS_HTTP_API_KEY: z.string().optional(),
  NOTIFICATION_TIMEOUT_MS: z.coerce.number().int().min(100).max(60000).default(5000),
  NOTIFICATION_ATTEMPT_TIMEOUT_MS: z.coerce.number().int().min(50).max(60000).default(1500),
  NOTIFICATION_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
  NOTIFICATION_RETRY_DELAY_MS: z.coerce.number().int().min(0).max(5000).default(100),
  CONNECTOR_REMO_API_KEY: z.string().default(""),
  REMO_API_BASE_URL: z.url().default("https://api.virtual.events.com/api/v1"),
  REMO_EVENT_BASE_URL: z.url().default("https://virtual.events.com"),
  REMO_COMPANY_ID: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  REMO_QUOTA_REFERENCE: z.string().trim().min(3).max(200).optional(),
  REMO_HOST_EMAIL: z.email().optional(),
  REMO_FLOOR_TEMPLATE: z.string().min(1).max(100).default("PHOTOREALISTIC-PHOTO-REALISTIC"),
  REMO_FLOOR_THEME: z.string().min(1).max(100).default("REALISTIC"),
  REMO_SSO_ENABLED: bool,
  REMO_SAML_IDP_ENTITY_ID: z.string().optional(),
  REMO_SAML_SSO_URL: z.string().optional(),
  REMO_SAML_SP_ENTITY_ID: z.string().optional(),
  REMO_SAML_ACS_URL: z.string().optional(),
  REMO_SAML_KEY_FILE: z.string().optional(),
  REMO_SAML_CERT_FILE: z.string().optional(),
  REMO_SAML_PREVIOUS_CERT_FILE: z.string().optional(),
  CONNECTOR_REMO_PROVIDER: z.enum(["disabled", "local", "remo"]).default("disabled"),
  REMO_LOCAL_BASE_URL: z.url().default("http://127.0.0.1:8028"),
  REMO_LOCAL_API_KEY: z.string().min(16).default("dealpme-local-events"),
  REMO_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(3000),
  REMO_ACCOUNT_KEY: z.string().regex(/^[a-z0-9_-]{3,64}$/).default("local-shared"),
  REMO_MAX_CONCURRENT: z.coerce.number().int().min(1).max(100).default(2),
  REMO_MARGIN_MINUTES: z.coerce.number().int().min(0).max(120).default(10),
  REMO_ACCOUNT_BRAND_LABEL: z.string().trim().min(1).max(100).default("DealPME"),
  REMO_ACCOUNT_BRAND_ACCENT: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1C2751"),
  REMO_ACCOUNT_BRAND_WELCOME: z.string().max(300).default("Bienvenue à cette rencontre"),
  REMO_ACCOUNT_BRAND_VERSION: z.string().min(1).max(64).default("local-v1"),
  CONNECTOR_REMO_WEBHOOK_SECRET: z.string().min(16).optional(),
  FEATURE_TRANSACTION_FEES: bool,
  FEATURE_LICENSED_PARTNER_HANDOFF: bool,
  FEATURE_BIOMETRIC_KYC: bool,
  FEATURE_SHARE_DEAL_LISTING: bool,
  FEATURE_DEALLENS: bool,
  RPS_DEFAULT_CIRCLE_CAP: z.coerce.number().int().positive().default(50),
}).superRefine((env, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  try {
    resolveRegistryConfig({ NODE_ENV: env.NODE_ENV, CFE_API_ENABLED: env.CFE_API_ENABLED, CONNECTOR_REGISTRY_MODE: env.CONNECTOR_REGISTRY_MODE, CONNECTOR_REGISTRY_PROVIDER: env.CONNECTOR_REGISTRY_PROVIDER, CFE_API_BASE_URL: env.CFE_API_BASE_URL, CFE_API_TIMEOUT_MS: env.CFE_API_TIMEOUT_MS });
  } catch (error) { issue("CFE_API_ENABLED", error instanceof Error ? error.message : "Configuration registre invalide"); }
  let databaseUser = "";
  try { databaseUser = new URL(env.DATABASE_URL_CORE).username; } catch { issue("DATABASE_URL_CORE", "URL PostgreSQL invalide"); }
  if (databaseUser === "dealpme_core" && env.NODE_ENV !== "test") issue("DATABASE_URL_CORE", "Utiliser le rôle applicatif dealpme_api, pas le propriétaire");
  if (!!env.SMTP_USER !== !!env.SMTP_PASSWORD) issue("SMTP_USER", "Utilisateur et mot de passe SMTP doivent être fournis ensemble");
  if (env.NOTIFICATION_ATTEMPT_TIMEOUT_MS > env.NOTIFICATION_TIMEOUT_MS) issue("NOTIFICATION_ATTEMPT_TIMEOUT_MS", "Le délai par tentative ne peut dépasser le budget global");
  if (env.NODE_ENV !== "test" && (env.CONNECTOR_EMAIL_PROVIDER === "fake" || env.CONNECTOR_SMS_PROVIDER === "fake")) issue("CONNECTOR_SMS_PROVIDER", "Les faux transports sont réservés aux tests ; utiliser mailpit/local en développement");
  if (env.CONNECTOR_SMS_PROVIDER === "local" && !/^https?:\/\//.test(env.SMS_LOCAL_BASE_URL)) issue("SMS_LOCAL_BASE_URL", "URL HTTP locale attendue");
  if (env.CONNECTOR_SMS_PROVIDER === "generic-http") {
    try {
      const url = new URL(env.SMS_HTTP_BASE_URL ?? "");
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) issue("SMS_HTTP_BASE_URL", "Passerelle HTTPS sans identifiants dans l'URL attendue");
    } catch { issue("SMS_HTTP_BASE_URL", "URL HTTPS de passerelle requise"); }
    if (!env.SMS_HTTP_API_KEY?.trim()) issue("SMS_HTTP_API_KEY", "Clé de passerelle requise");
  }
  if (env.NODE_ENV === "production") {
    if (env.CONNECTOR_REMO_PROVIDER === "local") issue("CONNECTOR_REMO_PROVIDER", "Simulateur événementiel interdit en production");
    if (env.CONNECTOR_EMAIL_PROVIDER !== "smtp") issue("CONNECTOR_EMAIL_PROVIDER", "SMTP réel requis en production");
    if (env.CONNECTOR_SMS_PROVIDER !== "generic-http") issue("CONNECTOR_SMS_PROVIDER", "Passerelle réelle requise en production");
    if (!env.SMTP_SECURE && !env.SMTP_REQUIRE_TLS) issue("SMTP_REQUIRE_TLS", "TLS obligatoire en production");
    if (!env.SMTP_USER || !env.SMTP_PASSWORD) issue("SMTP_USER", "Authentification SMTP requise en production");
  }
  if (env.CONNECTOR_REMO_PROVIDER === "remo") {
    if (!env.CONNECTOR_REMO_API_KEY.trim() || /[\r\n]/.test(env.CONNECTOR_REMO_API_KEY)) issue("CONNECTOR_REMO_API_KEY", "App Token requis");
    if (!env.REMO_COMPANY_ID) issue("REMO_COMPANY_ID", "Company ID requis");
    if (!env.REMO_QUOTA_REFERENCE || env.REMO_ACCOUNT_KEY === "local-shared") issue("REMO_ACCOUNT_KEY", "Compte réel distinct et référence de quota requis");
    for (const field of ["REMO_API_BASE_URL", "REMO_EVENT_BASE_URL"] as const) { const url = new URL(env[field]); if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) issue(field, "URL HTTPS sans identifiants ni paramètres requise"); }
  }
  if (env.REMO_SSO_ENABLED) {
    for (const field of ["REMO_SAML_IDP_ENTITY_ID", "REMO_SAML_SSO_URL", "REMO_SAML_ACS_URL"] as const) {
      try { const url = new URL(env[field] ?? ""); if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) issue(field, "URL SAML HTTPS fixe requise"); } catch { issue(field, "URL SAML requise"); }
    }
    for (const field of ["REMO_SAML_SP_ENTITY_ID", "REMO_SAML_KEY_FILE", "REMO_SAML_CERT_FILE"] as const) if (!env[field]?.trim()) issue(field, "Paramètre SAML requis lorsque le SSO est activé");
  }
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuration invalide :\n${issues}`);
  }
  return parsed.data;
}

export function loadEnv(source?: NodeJS.ProcessEnv): Env {
  if (source) return parseEnv(source);
  cached ??= parseEnv(process.env);
  return cached;
}
