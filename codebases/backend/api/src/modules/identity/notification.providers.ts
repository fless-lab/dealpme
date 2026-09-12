import { createFakeEmail, createSmtpAdapter, type EmailPort } from "@dealpme/connector-email";
import { createFakeSms, createGenericHttpAdapter, type SmsPort } from "@dealpme/connector-sms";
import type { Env } from "../../config/env.js";
import { TransportError } from "@dealpme/notifications";

function policy(env: Env) {
  return { totalTimeoutMs: env.NOTIFICATION_TIMEOUT_MS, attemptTimeoutMs: env.NOTIFICATION_ATTEMPT_TIMEOUT_MS, maxAttempts: env.NOTIFICATION_MAX_ATTEMPTS, retryDelayMs: env.NOTIFICATION_RETRY_DELAY_MS };
}
export function emailProvider(env: Env): EmailPort {
  if (env.CONNECTOR_EMAIL_PROVIDER === "fake") return createFakeEmail();
  if (!["smtp", "mailpit"].includes(env.CONNECTOR_EMAIL_PROVIDER)) throw new TransportError("CONFIGURATION_ERROR");
  return createSmtpAdapter({ host: env.SMTP_HOST, port: env.SMTP_PORT, from: env.EMAIL_FROM,
    secure: env.SMTP_SECURE, requireTLS: env.SMTP_REQUIRE_TLS,
    ...(env.SMTP_USER ? { user: env.SMTP_USER, password: env.SMTP_PASSWORD! } : {}), policy: policy(env) });
}
export function smsProvider(env: Env): SmsPort {
  if (env.CONNECTOR_SMS_PROVIDER === "fake") return createFakeSms();
  if (!["local", "generic-http"].includes(env.CONNECTOR_SMS_PROVIDER)) throw new TransportError("CONFIGURATION_ERROR");
  return createGenericHttpAdapter(env.CONNECTOR_SMS_PROVIDER === "local"
    ? { baseUrl: env.SMS_LOCAL_BASE_URL, apiKey: env.SMS_LOCAL_API_KEY, local: true, policy: policy(env) }
    : { baseUrl: env.SMS_HTTP_BASE_URL!, apiKey: env.SMS_HTTP_API_KEY!, policy: policy(env) });
}
