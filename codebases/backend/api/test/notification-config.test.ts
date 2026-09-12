import { describe, expect, it } from "vitest";
import { parseEnv, loadEnv } from "../src/config/env.js";

const base = {
  NODE_ENV: "development", DATABASE_URL_CORE: "postgres://dealpme_api:test@127.0.0.1/core",
  DATABASE_URL_VDR: "postgres://test:test@127.0.0.1/vdr", S3_ENDPOINT: "http://127.0.0.1:9000",
  S3_REGION: "test", S3_ACCESS_KEY: "test", S3_SECRET_KEY: "test", S3_BUCKET_VDR: "vdr", S3_BUCKET_IDENTITY: "identity",
  SESSION_SECRET: "test-session-secret-123456", FIELD_ENCRYPTION_KEY: "test-field-secret-123456",
};
describe("configuration des notifications", () => {
  it("sélectionne SMTP/Mailpit et SMS local en développement", () => {
    expect(parseEnv(base)).toMatchObject({ CONNECTOR_EMAIL_PROVIDER: "mailpit", CONNECTOR_SMS_PROVIDER: "local", SMTP_PORT: 1025, SMTP_SECURE: false });
  });
  it.each(["SMTP_SECURE", "SMTP_REQUIRE_TLS", "FEATURE_SHARE_DEAL_LISTING"])("refuse une valeur booléenne ambiguë pour %s", (key) => {
    expect(() => parseEnv({ ...base, [key]: "yes" })).toThrow();
  });
  it.each(["CONNECTOR_EMAIL_PROVIDER", "CONNECTOR_SMS_PROVIDER"])("refuse un fournisseur inconnu pour %s", (key) => {
    expect(() => parseEnv({ ...base, [key]: "inventé" })).toThrow();
  });
  it("réserve fake aux tests et refuse le local en production", () => {
    expect(() => parseEnv({ ...base, CONNECTOR_SMS_PROVIDER: "fake" })).toThrow();
    expect(() => parseEnv({ ...base, NODE_ENV: "production" })).toThrow();
    expect(parseEnv({ ...base, NODE_ENV: "test", CONNECTOR_SMS_PROVIDER: "fake" }).CONNECTOR_SMS_PROVIDER).toBe("fake");
  });
  it("exige TLS et les deux identifiants SMTP en production", () => {
    const production = { ...base, NODE_ENV: "production", CONNECTOR_EMAIL_PROVIDER: "smtp", CONNECTOR_SMS_PROVIDER: "generic-http", SMS_HTTP_BASE_URL: "https://sms.example.test", SMS_HTTP_API_KEY: "test-key", SMTP_USER: "test", SMTP_PASSWORD: "test", SMTP_REQUIRE_TLS: "true" };
    expect(parseEnv(production).SMTP_REQUIRE_TLS).toBe(true);
    expect(() => parseEnv({ ...production, SMTP_REQUIRE_TLS: "false" })).toThrow();
    expect(() => parseEnv({ ...production, SMTP_PASSWORD: "" })).toThrow();
    expect(() => parseEnv({ ...production, SMS_HTTP_BASE_URL: "http://sms.example.test" })).toThrow();
  });
  it("ne met pas en cache les environnements fournis explicitement", () => {
    expect(loadEnv({ ...base, SMTP_PORT: "1025" }).SMTP_PORT).toBe(1025);
    expect(loadEnv({ ...base, SMTP_PORT: "2025" }).SMTP_PORT).toBe(2025);
  });
  it("borne le budget et les tentatives", () => {
    expect(() => parseEnv({ ...base, NOTIFICATION_TIMEOUT_MS: "100", NOTIFICATION_ATTEMPT_TIMEOUT_MS: "200" })).toThrow();
    expect(() => parseEnv({ ...base, NOTIFICATION_MAX_ATTEMPTS: "999" })).toThrow();
  });
});
