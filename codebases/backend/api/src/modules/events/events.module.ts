import { Module } from "@nestjs/common";
import { RemoBridgeService } from "./remo-bridge.service.js";
import { RemoWebhookController } from "./remo-webhook.controller.js";

/**
 * Modules CNX + DIA (V4) : Deal-Connect (événements B2B) et Guichet Diaspora.
 * Sous-modules : événements et sessions, stands, billetterie et sponsoring (revenus catégorisés pour la rétrocession),
 * rendez-vous mutuels opt-in, rapport post-événement, entonnoir d'auto-inscription avec attribution,
 * profil diaspora, liste de suivi, rendez-vous sécurisé, contraintes transfrontalières.
 * Processus : P20, P21.
 *
 * Point de branchement de Remo.co : RemoBridgeService (voir ce fichier pour les deux modes d'intégration).
 * DealPME reste le système de référence pour l'inscription, l'attribution, le consentement et les revenus ;
 * Remo héberge la session live (stands, tables, vidéo) et renvoie la présence par webhook.
 */
@Module({
  controllers: [RemoWebhookController],
  providers: [RemoBridgeService],
  exports: [RemoBridgeService],
})
export class EventsModule {}
