import { Module } from "@nestjs/common";

/**
 * Module VDR (V2) : Data room et questions-réponses : base séparée, rendu serveur page à page, filigrane dynamique, téléchargement désactivé par défaut, accès scopés à expiration obligatoire, révocation en moins de 60 s, journal des consultations.
 * Processus contractuel : P12.
 * Sous-modules prévus : folders (arborescence OHADA); documents (upload, antivirus, OCR, versions); viewer (rendu serveur, filigrane); access (grants, Clean Team, révocation); qa (fils par document); audit (DocumentView).
 * Fiche complète : docs/modules/dataroom.md. Vide jusqu'à sa version ; le contrat est figé ici pour que
 * l'architecture n'ait pas à être réorganisée plus tard.
 */
@Module({})
export class DataroomModule {}
