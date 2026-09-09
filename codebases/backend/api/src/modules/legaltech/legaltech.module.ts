import { Module } from "@nestjs/common";

/**
 * Module LEG (V3) : LegalTech OHADA et conformité fiscale : modèles versionnés avec référence du conseil, génération PDF avec mention 'aide à la rédaction', contrat de travail sous Code du travail togolais, alertes sur clauses d'agrément et de préemption, module fiscal partenaire derrière drapeau.
 * Processus contractuel : P19.
 * Sous-modules prévus : templates (modèles versionnés); generation (PDF, variables, mentions); tax (module partenaire, jamais de fausse attestation).
 * Fiche complète : docs/modules/legaltech.md. Vide jusqu'à sa version ; le contrat est figé ici pour que
 * l'architecture n'ait pas à être réorganisée plus tard.
 */
@Module({})
export class LegaltechModule {}
