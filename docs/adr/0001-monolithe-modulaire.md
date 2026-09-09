# ADR 0001 : monolithe modulaire pour la plateforme

Date : 09/09/2026. Statut : accepté.

## Contexte

Le v0 fixe un plafond pilote de 2 000 comptes, 300 sessions concurrentes, 200 deals actifs et interdit de sur-construire
(risque R15). L'équipe de développement n'est pas encore confirmée ; la première livraison est due le 15/10/2026.

## Décision

Une seule application API (NestJS) découpée en modules alignés sur les modules fonctionnels de la cartographie,
plus un worker pour les traitements asynchrones. Seuls le RPS et DealLens sont des services séparés, pour des raisons
réglementaires (RPS) et techniques (IA en Python).

## Conséquences

- Une seule base de code à recruter, tester et déployer pendant le pilote.
- Les frontières de modules sont des frontières de dossiers et de contrats, pas de réseau : une extraction ultérieure
  en service reste possible module par module.
- Le découpage en bases (core / vdr / rps) est décidé dès maintenant pour ne pas avoir à migrer des données plus tard.
