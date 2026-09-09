# Module MKT : marketplace

- Classe : `MarketplaceModule` (`codebases/backend/api/src/modules/marketplace/`)
- Version cible : V1
- Processus contractuels : P04, P05, P09

## Périmètre

Pass Transmission : dossier cédant, opportunités T0, recherche, mise en relation, alertes opt-in, évaluation indicative.

## Sous-modules

- dossier
- listing
- search
- interest
- alerts
- valuation

## Règles à ne jamais contourner

- Autorisation côté serveur uniquement ; RLS en base pour les tables liées à un deal.
- Aucun champ au-delà du palier de divulgation autorisé ne sort du serveur.
- Chaque action sensible produit un événement d'audit (identifiants, action, résultat, corrélation).
- Français langue source ; termes OHADA jamais traduits.

## Suivi

Les tâches de ce module sont dans `DealPME_Suivi.xlsx`, onglet Taches, colonne Module = MKT.
