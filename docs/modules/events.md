# Module CNX / DIA : events

- Classe : `EventsModule` (`codebases/backend/api/src/modules/events/`)
- Versions cibles : V1 léger, V2 réunions privées et rapports, V4 salons/services complets
- Processus contractuels : P20, P21

## Périmètre

Deal-Connect et Guichet Diaspora avec pont Remo.co (deux modes : DEALPME_FIRST par défaut, REMO_FIRST optionnel).

## Réunion direction du 12/09/2026

- V1 : organiser depuis DealPME, personnaliser chaque événement et vérifier les limites du compte
  mutualisé entre produits. Les listes/inscriptions existantes sont conservées. Qualification technique
  V1-104, console V1-105, réservations V1-106 et prototype de captation V1-107.
- V2 : mini-réunions privées depuis le dossier (V2-047), connecteur d'agent participant (V2-048),
  transcription/rapport sourcé et diffusion ciblée (V2-049), tests de permissions et d'injection (V2-050).
- V4 : compte rendu du contenu par session de salon (V4-026), distinct des statistiques de présence P20.

Les quotas, SSO, APIs d'enregistrement et captation des tables restent à tester avec les accès organisateur.
Une mini-réunion de cession de titres applique les permissions RPS/NDA/T2 ; elle ne devient pas un salon
public. L'agent est un participant autorisé et son rapport respecte les droits de la session.

Architecture cible et preuves : [intégrations réutilisables](../INTEGRATIONS_LOCALES.md),
[lots L05/L09/L11](../PLAN_EXECUTION.md), décisions A17/A18/A21 du classeur.

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
