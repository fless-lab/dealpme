# Module GOV / CCI : institution

- Classe : `InstitutionModule` (`codebases/backend/api/src/modules/institution/`)
- Version cible : V1
- Processus contractuels : P06, P22

## Périmètre

Espace CCI-Togo : confirmation d'adhésion par référence, vérification RCCM/CFE, certification Deal-Ready nominative, tableau de bord agrégé.

## Sous-modules

- membership
- registry
- certification
- dashboard

## Règles à ne jamais contourner

- Autorisation côté serveur uniquement ; RLS en base pour les tables liées à un deal.
- Aucun champ au-delà du palier de divulgation autorisé ne sort du serveur.
- Chaque action sensible produit un événement d'audit (identifiants, action, résultat, corrélation).
- Français langue source ; termes OHADA jamais traduits.

## Suivi

Les tâches de ce module sont dans `DealPME_Suivi.xlsx`, onglet Taches, colonne Module = GOV.
