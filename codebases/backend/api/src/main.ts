import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import express from "express";
import { AppModule } from "./app.module.js";
import { loadEnv } from "./config/env.js";
import { DealPmeExceptionFilter } from "./platform/error.filter.js";
import { correlationIdMiddleware } from "./platform/correlation-id.middleware.js";
import { securityHeaders } from "./platform/security-headers.middleware.js";
import type { RequestWithRawBody } from "./platform/webhook-signature.js";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const production = env.NODE_ENV === "production";
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false, logger: production ? ["error", "warn"] : ["log", "error", "warn"] });

  app.setGlobalPrefix("v1"); // API versionnée par le chemin (convention v0)
  app.set("trust proxy", production ? 1 : false); // derrière un seul proxy en production : l'IP client vient de X-Forwarded-For
  app.disable("x-powered-by");

  // Corps JSON limité à 1 Mo ; le corps brut est conservé pour la vérification HMAC des webhooks.
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        (req as RequestWithRawBody).rawBody = Buffer.from(buf);
      },
    }),
  );
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));
  app.use(securityHeaders(production));
  app.use(correlationIdMiddleware);

  // CORS strict : uniquement l'origine de l'application web, méthodes et en-têtes explicites.
  app.enableCors({
    origin: [env.APP_BASE_URL],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Correlation-Id"],
    exposedHeaders: ["X-Correlation-Id"],
    credentials: false,
    maxAge: 600,
  });

  app.useGlobalFilters(new DealPmeExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(env.API_PORT);
  // eslint-disable-next-line no-console
  console.log(`API DealPME en écoute sur http://localhost:${env.API_PORT}/v1 (${env.NODE_ENV})`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Démarrage impossible :", err);
  process.exit(1);
});
