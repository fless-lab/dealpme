# Architecture DealPME

Référence : cahier des charges v0 approuvé (25/06/2026), Référentiel de processus P04 à P25, corpus de référence V3.1.
Pile : TypeScript de bout en bout (NestJS, Next.js, Drizzle, PostgreSQL), DealLens en Python (V5).

## Principe directeur

Un monorepo, un modèle de données unique, trois zones d'exécution isolées imposées par le v0 :

1. La plateforme (API + worker) : monolithe modulaire, un module par module fonctionnel.
2. Le Regulatory Perimeter Service (RPS) : service indépendant, base séparée, journal haché, déployable seul.
3. La data room : base et identifiants distincts de la marketplace (DP-OPS-042).

Pas de microservices partout : le plafond du pilote est de 2 000 comptes et le v0 interdit de sur-construire.

## Carte des modules

| Code | Module NestJS | Version | Processus | Base |
|---|---|---|---|---|
| FOND / TRV | platform, database | V1 | - | core |
| IDN | identity | V1 | P08 | core |
| GOV / CCI | institution | V1 | P06, P22 | core |
| MKT | marketplace | V1 | P04, P05, P09 | core |
| RPS | engine/rps (service séparé) | V1 démo / V2 | P07, P10 | rps |
| SIG | signature | V2 | P11 | vdr |
| VDR | dataroom | V2 | P12 | vdr |
| NEG / REA | negotiation | V3 | P14, P15, P16 | core |
| LEG | legaltech | V3 | P19 | core |
| FIN | finance | V3 | P24 | core |
| SUP | support | V3 | P23 | core |
| OPS | platform, infra | V1 base / V3 durci | P25 | - |
| REB | rebound | V4 | P17, P18 | core |
| CNX / DIA | events (pont Remo.co) | V4 | P20, P21 | core |
| EXP | experts | V4 (module complet ; articulation antérieure en A04) | P13 | core |
| VDR-IA | engine/deallens (Python) | V5 | - | vdr (lecture) |

Chaque module a sa fiche dans `docs/modules/` et ses tâches dans `DealPME_Suivi.xlsx` (onglet Taches, colonne Module).

## Flux principaux

### Publication d'un dossier (V1, cessions d'actifs)

```
web -> POST /v1/deals/:id/transitions {to: LISTED_OPEN}
api.marketplace -> @dealpme/rules.transition (machine à états)
                -> SHARE_DEAL ? PERIMETER_BLOCKED (drapeau SHARE_DEAL_LISTING fermé en V1, scénario de la démonstration)
                -> deal_event + audit_event
```

### Publication d'une cession de titres (V2)

```
api.marketplace -> POST rps/v1/deals/:id/publication-check {dealType, requestedTier, audience}
rps.gate        -> decidePublication : OPEN_SURFACE -> PERIMETER_BLOCKED (nullité) ; AUTHENTICATED -> T0 seulement
                -> journal réglementaire haché (permis ou bloqué, dans les deux cas)
api             -> LISTED_RESTRICTED uniquement si rps.allowed
admission       -> POST rps/v1/deals/:id/admissions {personId, decidedBy, justification} : décision humaine, compteur, plafond 50
```

### Accès data room (V2)

```
@dealpme/rules.openVdr(state) -> LOGIN_REQUIRED | QUALIFICATION_REQUIRED | ADMISSION_REQUIRED | NDA_REQUIRED | T2_GRANT_REQUIRED | VDR_HOME | ACCESS_REVOKED
api.dataroom -> URL pré-signée courte liée à la session -> worker.ingestion a rendu la page avec filigrane
révocation   -> access_grant.revoked_at + rotation de clé de session : effet en moins de 60 s
```

### Événement Deal-Connect avec Remo.co (V4)

```
DEALPME_FIRST (défaut)
  web -> inscription, consentement, attribution de campagne, paiement (mobile-money) -> api.events
  api.events.RemoBridgeService.publishToRemo -> connector-remo.createEvent
  participant confirmé -> connector-remo.participantJoinUrl (lien unique, nom d'affichage seulement)
  Remo -> POST /v1/webhooks/remo/attendance (signature vérifiée, idempotent) -> présence -> rapport post-événement (P20)
REMO_FIRST (option)
  Remo porte inscription et billetterie carte ; api.events synchronise inscrits et billets par API pour l'attribution et le reporting
```

## Contrats entre couches

- `@dealpme/domain` : entités, énumérations, identifiants, monnaie. Aucune dépendance.
- `@dealpme/contracts` : schémas d'API (zod), enveloppe d'erreur, codes. Dépend de domain.
- `@dealpme/rules` : logique pure (états, paliers, entitlements, matching, évaluation, porte VDR, frais). Sans I/O.
- `@dealpme/connector-*` : un port par dépendance externe ; l'API ne connaît que le port.
- `@dealpme/ui` : jetons de la charte et composants nommés ; jamais une frontière de sécurité.

## Sécurité par construction

- Autorisation évaluée par l'API (RolesGuard, CurrentPrincipal) et par la base (RLS, `drizzle/core/rls.sql`).
- Allow-list serveur par palier (`disclosure-allowlist.ts`) ; test DISCLOSURE_LEAK obligatoire.
- Triggers : `deal_type` immuable, attribution immuable, `disclosure_count` réservé au RPS, tables append-only.
- Idempotency-Key obligatoire sur paiements et webhooks ; signatures de webhook vérifiées avant traitement.
- Drapeaux gouvernés par avis juridique : `FEATURE_TRANSACTION_FEES`, `FEATURE_LICENSED_PARTNER_HANDOFF`, `FEATURE_BIOMETRIC_KYC`.
- Pièces déposées : analyse antivirus avant écriture, liste fermée de types acceptés, stockage objet privé et chiffré,
  contenu servi par l'API et jamais par une adresse de stockage, versionnage sans réécriture (ADR 0007).

## Décisions d'architecture

| ADR | Objet |
|---|---|
| [0001](adr/0001-monolithe-modulaire.md) | Monolithe modulaire plutôt que microservices, sauf le RPS |
| [0002](adr/0002-rps-service-independant.md) | Regulatory Perimeter Service déployé séparément |
| [0003](adr/0003-isolation-data-room.md) | Isolation de la data room : base et stockage distincts |
| [0004](adr/0004-typescript-bout-en-bout.md) | TypeScript de bout en bout |
| [0005](adr/0005-connecteurs-externes.md) | Connecteurs externes derrière des ports |
| [0006](adr/0006-sessions-serveur.md) | Sessions opaques côté serveur plutôt que jetons autoportants |
| [0007](adr/0007-depot-de-pieces.md) | Dépôt des pièces : antivirus avant stockage, aucune adresse publique |

## Environnements

- Local : `infra/docker-compose.yml` (trois Postgres, Redis, MinIO, Mailpit).
- Pilote : un hôte Docker par environnement (staging, production) suffit pour 2 000 comptes ; RPS et data room sur des instances Postgres distinctes avec identifiants distincts.
- CI : `.github/workflows/ci.yml` (build, typecheck, lint, tests, audit des vulnérabilités critiques, pile réelle avec antivirus ClamAV).

## Exploitation

- Sondes : `GET /v1/health` (le processus vit, compteur d'erreurs serveur sur cinq minutes, état dégradé au-delà de dix)
  et `GET /v1/ready` (bases core et data room, Redis). Un déploiement qui ne passe pas `/ready` ne prend pas de trafic.
- Journaux : une ligne JSON par requête sur la sortie standard, avec méthode, chemin, code, durée et identifiant de
  corrélation. Aucun corps, aucun jeton, aucune adresse email ; les valeurs sensibles des URL sont masquées.
- Sauvegardes : `devX/backup.sh` (trois bases en format personnalisé, objets stockés en miroir, empreintes SHA-256)
  et `devX/restore-test.sh`, qui restaure dans une base jetable et compare les décomptes. Une sauvegarde jamais
  restaurée n'est pas une sauvegarde.
- Antivirus : ClamAV en service local et en intégration continue ; l'API refuse de démarrer en production avec le
  faux moteur, et refuse tout dépôt si le moteur ne répond pas.
