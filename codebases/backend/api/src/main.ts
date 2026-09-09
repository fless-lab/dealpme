import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { loadEnv } from "./config/env.js";
import { DealPmeExceptionFilter } from "./platform/error.filter.js";
import { correlationIdMiddleware } from "./platform/correlation-id.middleware.js";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.setGlobalPrefix("v1"); // API versionnée par le chemin (convention v0)
  app.use(correlationIdMiddleware);
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
