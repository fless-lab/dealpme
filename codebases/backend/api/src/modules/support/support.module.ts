import { Module } from "@nestjs/common";

/**
 * Module SUP (V3) : Support et accès privilégiés : tickets P1 à P4 avec délais contractuels, accès administrateur motivé, scopé, expirant, notification du propriétaire du dossier, mode break-glass journalisé.
 * Processus contractuel : P23.
 * Sous-modules prévus : tickets (sévérités, SLA); privileged-access (break-glass, notification).
 * Fiche complète : docs/modules/support.md. Vide jusqu'à sa version ; le contrat est figé ici pour que
 * l'architecture n'ait pas à être réorganisée plus tard.
 */
@Module({})
export class SupportModule {}
