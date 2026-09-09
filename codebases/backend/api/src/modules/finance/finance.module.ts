import { Module } from "@nestjs/common";

/**
 * Module FIN (V3) : Finance : enregistrement des revenus par catégorie, revenu net avec décomposition, barème de frais sous drapeau juridique, rétrocession CCI par catégorie avec test d'éligibilité, journal de calcul recalculable, reporting trimestriel archivé, fenêtre de contestation de 30 jours, export d'audit scopé.
 * Processus contractuel : P24.
 * Sous-modules prévus : revenue (catégories, attribution); fees (barème, minimum, drapeau); retrocession (calcul, journal); reporting (continu, trimestriel, contestation).
 * Fiche complète : docs/modules/finance.md. Vide jusqu'à sa version ; le contrat est figé ici pour que
 * l'architecture n'ait pas à être réorganisée plus tard.
 */
@Module({})
export class FinanceModule {}
