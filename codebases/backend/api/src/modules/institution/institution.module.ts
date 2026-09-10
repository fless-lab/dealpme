import { Module } from "@nestjs/common";
import { CertificationRequestController } from "./certification-request.controller.js";
import { CertificationRequestService } from "./certification-request.service.js";
import { InstitutionController } from "./institution.controller.js";
import { InstitutionService } from "./institution.service.js";
import { REGISTRY_PORT, registryPortFactory } from "./registry.provider.js";

/**
 * Modules GOV + CCI (V1) : espace institutionnel CCI-Togo.
 * Sous-modules : confirmation d'adhésion (référence seulement), vérification RCCM/CFE (connecteur registry,
 * mode API ou saisie supervisée), certification Deal-Ready nominative, tableau de bord agrégé.
 * Processus : P06, P22. Règle : la certification n'est jamais automatique (DP-CCI-006).
 */
@Module({
  controllers: [InstitutionController, CertificationRequestController],
  providers: [InstitutionService, CertificationRequestService, { provide: REGISTRY_PORT, useFactory: registryPortFactory }],
  exports: [CertificationRequestService],
})
export class InstitutionModule {}
