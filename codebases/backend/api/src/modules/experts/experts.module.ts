import { Module } from "@nestjs/common";

/**
 * Module EXP (V4 (à confirmer)) : Deal-Experts : registre d'experts qualifiés, déclaration de conflit d'intérêts, routage du besoin, propositions et sélection par le client, contrat direct client-expert hors facturation DealPME, accès temporaire scopé en lecture expirant à la remise du livrable. Statut contractuel à trancher (arbitrage A04).
 * Processus contractuel : P13.
 * Sous-modules prévus : registry (experts, conflits); engagements (routage, sélection); scoped-access (lecture, expiration).
 * Fiche complète : docs/modules/experts.md. Vide jusqu'à sa version ; le contrat est figé ici pour que
 * l'architecture n'ait pas à être réorganisée plus tard.
 */
@Module({})
export class ExpertsModule {}
