# Module VDR : dataroom

- Classe : `DataroomModule` (`codebases/backend/api/src/modules/dataroom/`)
- Version cible : V2
- Processus contractuels : P12

## Périmètre

Data room et questions-réponses : base séparée, rendu serveur page à page, filigrane dynamique, téléchargement désactivé par défaut, accès scopés à expiration obligatoire, révocation en moins de 60 s, journal des consultations.

## Sous-modules

- folders (arborescence OHADA)
- documents (upload, antivirus, OCR, versions)
- viewer (rendu serveur, filigrane)
- access (grants, Clean Team, révocation)
- qa (fils par document)
- audit (DocumentView)

## Règles à ne jamais contourner

- Autorisation côté serveur uniquement ; RLS en base pour les tables liées à un deal.
- Aucun champ au-delà du palier de divulgation autorisé ne sort du serveur.
- Chaque action sensible produit un événement d'audit (identifiants, action, résultat, corrélation).
- Français langue source ; termes OHADA jamais traduits.

## Suivi

Les tâches de ce module sont dans `DealPME_Suivi.xlsx`, onglet Taches, colonne Module = VDR.
