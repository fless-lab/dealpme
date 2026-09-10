import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller.js";
import { EventsService } from "./events.service.js";
import { RemoBridgeService } from "./remo-bridge.service.js";
import { RemoWebhookController } from "./remo-webhook.controller.js";

/**
 * Modules CNX + DIA : Deal-Connect (événements B2B) et Guichet Diaspora.
 * V1 (décision du 10/09/2026) : événements, inscriptions DEALPME_FIRST, lien d'accès Remo, webhook de présence,
 * demande de rendez-vous diaspora. V4 : billetterie et sponsoring, rendez-vous mutuels, rapport post-événement,
 * profil diaspora complet, contraintes transfrontalières détaillées.
 * Processus : P20, P21. Point de branchement de Remo.co : RemoBridgeService.
 */
@Module({
  controllers: [EventsController, RemoWebhookController],
  providers: [EventsService, RemoBridgeService],
  exports: [RemoBridgeService],
})
export class EventsModule {}
