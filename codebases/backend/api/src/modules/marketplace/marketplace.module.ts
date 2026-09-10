import { Module } from "@nestjs/common";
import { CompanyController } from "./company.controller.js";
import { DealController } from "./deal.controller.js";
import { DealService } from "./deal.service.js";
import { SearchController } from "./search.controller.js";
import { ValuationController } from "./valuation.controller.js";
import { ValuationService } from "./valuation.service.js";
import { InstitutionModule } from "../institution/institution.module.js";

/**
 * Module MKT (V1) : Pass Transmission.
 * Sous-modules : dossier cédant (assistant, upload, provenance, complétude), opportunités T0, recherche et filtres,
 * mise en relation (intérêt, messagerie), alertes opt-in, tableau de bord cédant, évaluation indicative (P05).
 * Processus : P04, P05, P09. V1 : cessions d'actifs uniquement ; la branche titres est présente mais bloquée
 * par le drapeau SHARE_DEAL_LISTING et par le RPS (démonstration maquettée du blocage).
 */
@Module({
  imports: [InstitutionModule],
  controllers: [CompanyController, DealController, SearchController, ValuationController],
  providers: [DealService, ValuationService],
})
export class MarketplaceModule {}
