# ADR 0002 : le RPS est un service indépendant avec sa propre base

Date : 09/09/2026. Statut : accepté.

## Contexte

Le v0 (DP-RPS-010) exige un service discret, avec son propre datastore et un journal append-only haché, pour le
contrôle du périmètre réglementaire des cessions de titres : compteur de divulgation par personne, plafond de cercle,
filtre de communication, pack de preuves. La note investisseurs le présente comme le différenciateur central,
"difficile à ajouter après coup".

## Décision

`codebases/engine/rps` : application NestJS séparée, base `dealpme_rps`, exposée uniquement sur le réseau privé.
L'API plateforme l'interroge avant toute publication ou communication sur une cession de titres. Le compteur
`deal.disclosure_count` de la base core est protégé par trigger : seul le RPS peut l'écrire.

## Conséquences

- Le RPS peut être audité, testé et déployé indépendamment ; son journal est vérifiable sans accès au code.
- En V1 le service existe avec ses règles pures testées ; l'API ne l'appelle pas encore (démonstration maquettée).
- Toute évolution du RPS passe par une décision de conformité, jamais par une décision produit seule.
