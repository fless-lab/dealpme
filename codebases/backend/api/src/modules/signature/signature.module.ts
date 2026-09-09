import { Module } from "@nestjs/common";

/**
 * Module SIG (V2) : Signature électronique et preuve : NDA versionné, prestataire PSC accrédité ARCEP, repli papier, SignatureEvidence (hash, chaîne de certificats, horodatage), archivage PSAE.
 * Processus contractuel : P11.
 * Sous-modules prévus : nda (génération, versions); esign (intégration PSC, webhooks vérifiés); fallback (parcours papier, contre-signature, vérification CCIT); evidence (preuve et archivage).
 * Fiche complète : docs/modules/signature.md. Vide jusqu'à sa version ; le contrat est figé ici pour que
 * l'architecture n'ait pas à être réorganisée plus tard.
 */
@Module({})
export class SignatureModule {}
