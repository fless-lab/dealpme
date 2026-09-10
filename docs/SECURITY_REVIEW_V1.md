# Revue de sécurité interne V1

Périmètre : API plateforme, service RPS, bases core / vdr / rps, connecteurs (faux), jeu de démonstration.
Référence : cahier des charges v0 (sections 3, 10 et annexe C), registre de sécurité du classeur de suivi (onglet Securite).
Méthode : contrôle de chaque point par un test négatif rejouable (`devX/smoke_v1.sh`, 40 contrôles) ou par une tentative
de violation directe en base ; audit des dépendances ; lecture du code des points sensibles.

## Liste de contrôle v0 et résultat

| Point de contrôle (v0) | Résultat | Preuve |
|---|---|---|
| Contournement de palier : aucun champ au-delà de T0 dans une liste ou une fiche vue par un tiers | Conforme | `DISCLOSURE_LEAK` : aucun `askingPrice`, `companyLegalName`, `valuationBasis` dans `/opportunities` ni dans `/deals/:id` vu par un investisseur |
| Publication d'une cession de titres sur surface ouverte | Bloquée | `PERIMETER_BLOCKED` sur la transition `LISTED_OPEN` du dossier TropicVale ; décision journalisée `DEAL_PUBLICATION_BLOCKED` |
| Manipulation du compteur RPS depuis l'API | Impossible | Trigger `disclosure_count_rps_only` : `update deal set disclosure_count` refusé hors contexte RPS |
| Type de cession et attribution immuables | Conforme | Triggers `deal_type_immutable`, `attribution_immutable` ; tentatives refusées |
| Tables d'audit et d'événements append-only | Conforme | Trigger `append_only` : `delete from deal_event` refusé |
| Autorisation évaluée côté serveur | Conforme | Rôles refusés (403) : investisseur sur transition, cédant sur certification |
| RLS effective (un cédant ne lit pas le dossier d'un autre) | Conforme | Rôle `dealpme_api` sans `BYPASSRLS` ; contexte `app.organisation_id` par transaction ; dossier d'autrui non publié en 404 |
| Chiffrement des champs CONFIDENTIAL_DEAL | Conforme | `asking_price_enc` toujours préfixé `v1:`, aucun montant en clair ; propriétaire seul déchiffre |
| Force brute sur la connexion | Contrôlée | 6e échec en 429 ; verrouillage progressif ; échecs journalisés avec empreinte d'IP |
| Second facteur pour les rôles sensibles | Conforme | Officier CCI-Togo : défi OTP obligatoire, aucune session sans code |
| Vérification d'email | Conforme | Connexion refusée (403) tant que l'email n'est pas vérifié ; code faux 401 ; code consommé 401 |
| Webhooks | Conforme | Signature HMAC invalide 403 ; `Idempotency-Key` absent 400 ; rejeu sans double effet |
| En-têtes HTTP, CORS, taille des requêtes | Conforme | CSP, nosniff, referrer ; origine inconnue sans CORS ; corps > 1 Mo en 413 |
| URL pré-signées courtes de la data room | Non applicable en V1 | Aucun document de data room en V1 (registre S10, V2) |
| Secrets hors dépôt | Conforme | `.env` ignoré ; démarrage refusé sans secrets ; rôle propriétaire refusé pour l'API |
| Mots de passe de démonstration | Conforme | Uniques par compte, dérivés d'un secret local, fichier hors dépôt en lecture propriétaire ; chargement refusé hors développement |

## Audit des dépendances (10/09/2026)

- Avant revue : 12 vulnérabilités (0 critique, 5 élevées, 7 modérées).
- Actions : drizzle-orm 0.45.2 (injection SQL via identifiants), next 16.3.4 (postcss), vitest 5, override `multer` 2.3.0
  (déni de service par champs multipart, fuite de descripteurs). CI durcie : `npm audit --audit-level=high` bloquant.
- Après revue : 0 critique, 0 élevée, 4 modérées, toutes dans la chaîne esbuild de `drizzle-kit` (outil de ligne de commande
  de développement, jamais embarqué ni exposé). Acceptées ; à réévaluer à chaque mise à jour de drizzle-kit.

## Points ouverts et reports (voir onglet Securite du classeur)

- S09 pentest indépendant : V3 (porte G10). Mitigation V1 : cette revue, CI bloquante, aucun environnement public.
- S10 data room (rendu serveur, filigrane, révocation) : V2, aucun document stocké en V1.
- S11 signature qualifiée et archivage : V2, aucun NDA exécuté en V1.
- S12 mode break-glass : V3 ; en V1 l'administrateur n'a aucun endpoint d'accès aux données confidentielles.
- S13 biométrie : interdite sans autorisation IPDCP (drapeau fermé), voulu par le v0.
- S14 portes G1 à G10 : V3 ; V1 reste une démonstration à données synthétiques.
- Connecteurs SMS et email : faux en développement, interdits en production par construction ; les adaptateurs réels
  arrivent avec les contrats (jalons J08 et suivants).
- Journal des accès en échec : présent (`LOGIN_FAILED`, `ACCOUNT_LOCKED`, `RATE_LIMITED`) ; l'alerte automatique sur
  pic d'échecs arrive avec la supervision (V3, lot Exploitation).

## Règle de tenue

Aucune tâche du classeur ne passe en Complétée sans son test négatif. Ce document est mis à jour à chaque lot de
sécurité et relu avant chaque jalon de livraison.
