import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { RpsAppModule } from "./app.module.js";
import { RpsExceptionFilter } from "./error.filter.js";

/**
 * Regulatory Perimeter Service : déployable seul, base séparée, exposé uniquement sur le réseau privé.
 * Les décisions d'admission restent humaines ; ce service les enregistre, compte, plafonne et journalise.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(RpsAppModule);
  app.setGlobalPrefix("v1");
  app.useGlobalFilters(new RpsExceptionFilter());
  app.enableShutdownHooks();
  const port = Number(process.env["RPS_PORT"] ?? 4100);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`RPS en écoute sur http://localhost:${port}/v1 (réseau privé uniquement)`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Démarrage du RPS impossible :", err);
  process.exit(1);
});
