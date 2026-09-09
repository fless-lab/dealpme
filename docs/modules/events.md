# Module CNX / DIA : events

- Classe : `EventsModule` (`codebases/backend/api/src/modules/events/`)
- Version cible : V4
- Processus contractuels : P20, P21

## Périmètre

Deal-Connect et Guichet Diaspora avec pont Remo.co (deux modes : DEALPME_FIRST par défaut, REMO_FIRST optionnel).

## Sous-modules

- events
- booths
- ticketing
- meetings
- reporting
- diaspora

## Règles à ne jamais contourner

- Autorisation côté serveur uniquement ; RLS en base pour les tables liées à un deal.
- Aucun champ au-delà du palier de divulgation autorisé ne sort du serveur.
- Chaque action sensible produit un événement d'audit (identifiants, action, résultat, corrélation).
- Français langue source ; termes OHADA jamais traduits.

## Suivi

Les tâches de ce module sont dans `DealPME_Suivi.xlsx`, onglet Taches, colonne Module = CNX.
