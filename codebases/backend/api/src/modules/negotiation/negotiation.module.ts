import { Module } from "@nestjs/common";

/**
 * Module NEG / REA (V3) : Négociation et réalisation : offres et contre-offres versionnées, LOI générée par LegalTech, registre des points ouverts d'audit d'acquisition, décision poursuivre / renégocier / abandonner, réalisation déclarée par les parties sans Deal-Pay natif, création automatique du FeeEvent.
 * Processus contractuel : P14, P15, P16.
 * Sous-modules prévus : offers (offre, contre-offre); loi (lettre d'intention); diligence (points ouverts P15); closing (réalisation P16, FeeEvent).
 * Fiche complète : docs/modules/negotiation.md. Vide jusqu'à sa version ; le contrat est figé ici pour que
 * l'architecture n'ait pas à être réorganisée plus tard.
 */
@Module({})
export class NegotiationModule {}
