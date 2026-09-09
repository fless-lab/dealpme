# Module FIN : finance

- Classe : `FinanceModule` (`codebases/backend/api/src/modules/finance/`)
- Version cible : V3
- Processus contractuels : P24

## Périmètre

Finance : enregistrement des revenus par catégorie, revenu net avec décomposition, barème de frais sous drapeau juridique, rétrocession CCI par catégorie avec test d'éligibilité, journal de calcul recalculable, reporting trimestriel archivé, fenêtre de contestation de 30 jours, export d'audit scopé.

## Sous-modules

- revenue (catégories, attribution)
- fees (barème, minimum, drapeau)
- retrocession (calcul, journal)
- reporting (continu, trimestriel, contestation)

## Règles à ne jamais contourner

- Autorisation côté serveur uniquement ; RLS en base pour les tables liées à un deal.
- Aucun champ au-delà du palier de divulgation autorisé ne sort du serveur.
- Chaque action sensible produit un événement d'audit (identifiants, action, résultat, corrélation).
- Français langue source ; termes OHADA jamais traduits.

## Suivi

Les tâches de ce module sont dans `DealPME_Suivi.xlsx`, onglet Taches, colonne Module = FIN.
