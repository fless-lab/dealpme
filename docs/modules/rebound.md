# Module REB : rebound

- Classe : `ReboundModule` (`codebases/backend/api/src/modules/rebound/`)
- Version cible : V4
- Processus contractuels : P17, P18

## Périmètre

Alerte & Rebond : auto-diagnostic, dossier de crise confidentiel INVITE_ONLY, registre d'investisseurs de retournement, signalement statutaire, listings d'actifs en difficulté par catégorie, coupe-circuit opérateur, ingestion des annonces de dissolution.

## Sous-modules

- diagnostic (score de santé)
- crisis (dossier confidentiel)
- distressed-assets (listings, coupe-circuit)
- signals (flux CFE)

## Règles à ne jamais contourner

- Autorisation côté serveur uniquement ; RLS en base pour les tables liées à un deal.
- Aucun champ au-delà du palier de divulgation autorisé ne sort du serveur.
- Chaque action sensible produit un événement d'audit (identifiants, action, résultat, corrélation).
- Français langue source ; termes OHADA jamais traduits.

## Suivi

Les tâches de ce module sont dans `DealPME_Suivi.xlsx`, onglet Taches, colonne Module = REB.
