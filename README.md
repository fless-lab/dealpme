# DealPME

Place de marché de transmission et reprise de PME en Afrique francophone (zone OHADA), pilote Togo, en partenariat avec la CCI-Togo.

Périmètre de référence : cahier des charges v0 approuvé (25/06/2026) et Référentiel de processus P04 à P25. Suivi du projet : `DealPME_Suivi.xlsx` à la racine (régénérable avec `devX/build_suivi.py`).

Plan actif après réunion direction : [plan d'exécution par lots](docs/PLAN_EXECUTION.md), également dans
l'onglet `Plan_execution` du classeur. **L01/L02 terminés, L03/L04 opérationnels en local**
([notifications](docs/NOTIFICATIONS.md), [registre et exploitation](docs/EXPLOITATION_L04.md)) ;
recettes fournisseurs et installation sur serveur dédié encore ouvertes. **L05 — événements** :
[socle front/backend local éprouvé](docs/EVENEMENTS_L05.md), [SSO et branding Remo complet dans la suite du lot](docs/INTEGRATION_REMO.md).
Contexte : [bilan initial du 12/09/2026](docs/BILAN_AVANCEMENT_2026-09-12.md) et
[compte rendu de direction](docs/COMPTE_RENDU_DIRECTION_2026-09-12.md).
Le fichier `DealPME_Suivi.ods` est une archive d'un ancien calendrier ; le suivi actif est le `.xlsx`.

## Structure

```
packages/                  bibliothèques partagées (domain, contracts, i18n, testing, notifications, config)
codebases/backend/api      API REST /v1 : monolithe modulaire NestJS, un module par module fonctionnel
codebases/backend/worker   jobs asynchrones (matching, notifications, ingestion, webhooks)
codebases/engine/rps       Regulatory Perimeter Service : service indépendant, base séparée
codebases/engine/rules     moteurs de règles purs : machine à états, entitlements, matching, évaluation, paliers
codebases/engine/deallens  assistant IA (V5, Python), pare-feu de permission
codebases/external_connectors/*  un port + des adaptateurs + un faux par dépendance externe
codebases/frontend/web     site public et application (Next.js), français langue source
codebases/frontend/ui      design system : jetons de la charte et composants nommés
codebases/devtools/sms-inbox boîte SMS locale réutilisable (simulation, profil Docker local)
infra/                     docker-compose (3 bases Postgres, Redis, MinIO, Mailpit)
docs/                      architecture, conventions, décisions (ADR), fiches modules
```

Voir `docs/ARCHITECTURE.md` pour la carte complète et `docs/CONVENTIONS.md` pour les règles d'ingénierie issues du v0.

## Démarrer

```bash
cp .env.example .env
npm install
npm run infra:up          # Postgres core / vdr / rps, Redis, MinIO, Mailpit
npm run build:libs
npm run db:migrate:core
npm run db:migrate:rps
npm run dev:api           # http://localhost:4000/v1
npm run dev:rps           # http://localhost:4100/v1
npm run dev:worker
npm run dev:web           # http://localhost:3000
```

Tests : `npm test`. Vérification des types : `npm run typecheck`.

## Règles non négociables

- Le frontend n'est jamais la frontière de sécurité : chaque autorisation est évaluée par l'API, avec RLS en base.
- Aucun champ au-delà du palier de divulgation autorisé (T0 / T1 / T2) ne sort du serveur : allow-list côté serveur, pas de rendu conditionnel côté client.
- L'admission à un cercle de cession de titres et la certification Deal-Ready ne sont jamais automatiques.
- Les montants sont des entiers XOF. Les termes OHADA ne sont jamais traduits.
- Les drapeaux `FEATURE_TRANSACTION_FEES`, `FEATURE_LICENSED_PARTNER_HANDOFF`, `FEATURE_BIOMETRIC_KYC` restent à `false` tant que l'avis juridique ou l'autorisation correspondante n'est pas archivé.
- Toutes les données de démonstration sont synthétiques et étiquetées comme telles.
