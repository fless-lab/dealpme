# Module SUP : support

- Classe : `SupportModule` (`codebases/backend/api/src/modules/support/`)
- Version cible : V3
- Processus contractuels : P23

## Périmètre

Support et accès privilégiés : tickets P1 à P4 avec délais contractuels, accès administrateur motivé, scopé, expirant, notification du propriétaire du dossier, mode break-glass journalisé.

## Sous-modules

- tickets (sévérités, SLA)
- privileged-access (break-glass, notification)

## Règles à ne jamais contourner

- Autorisation côté serveur uniquement ; RLS en base pour les tables liées à un deal.
- Aucun champ au-delà du palier de divulgation autorisé ne sort du serveur.
- Chaque action sensible produit un événement d'audit (identifiants, action, résultat, corrélation).
- Français langue source ; termes OHADA jamais traduits.

## Suivi

Les tâches de ce module sont dans `DealPME_Suivi.xlsx`, onglet Taches, colonne Module = SUP.
