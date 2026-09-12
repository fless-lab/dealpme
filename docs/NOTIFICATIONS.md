# Notifications — SMTP, boîte SMS et parcours OTP

L03 : **opérationnel en local**, qualification des fournisseurs externes encore ouverte.
Preuve : [`qa/l03-verification.json`](../qa/l03-verification.json). Aucun SMS réel ni fournisseur SMTP
externe n'a été déclaré validé par les essais locaux.

## Démarrer

Dans `.env`, mettre à jour les paramètres non secrets correspondants à `.env.example` :

```dotenv
CONNECTOR_EMAIL_PROVIDER=mailpit
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_REQUIRE_TLS=false
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=notifications@demo.dealpme.local
MAILPIT_API_URL=http://127.0.0.1:8025
CONNECTOR_SMS_PROVIDER=local
SMS_LOCAL_BASE_URL=http://127.0.0.1:8026
SMS_LOCAL_API_KEY=dealpme-local-sms
```

Les fichiers `.env` personnels ne sont pas écrasés par ce lot. L'ancien `CONNECTOR_SMS_PROVIDER=fake`
doit être remplacé par `local` pour les parcours de développement. `fake` est désormais réservé aux tests
unitaires ; une configuration inconnue ou incohérente échoue au démarrage.

```bash
npm run infra:up       # compile les deux briques locales, puis active le profil Compose local
npm run build
# Puis les commandes habituelles de démarrage API / RPS / web.
```

- Email : **http://127.0.0.1:8025** (Mailpit ; SMTP sur 1025).
- SMS : **http://127.0.0.1:8026** (boîte simulée ; aucun envoi vers un téléphone).

Les commandes ci-dessus démarrent les services ; le runner de tests utilise ses propres ports éphémères.
Dans un réseau Docker, configurer les hôtes `mailpit` et `sms-inbox` au lieu de `127.0.0.1`.

## Briques réutilisables

| Chemin | Fonction |
|---|---|
| `packages/notifications` | Schémas des messages, options de livraison, erreurs, délais/reprises et estimation GSM-7/UCS-2 |
| `codebases/external_connectors/email` | Port email, faux mémoire et SMTP via Nodemailer |
| `codebases/external_connectors/sms` | Port SMS, faux mémoire et contrat de passerelle JSON HTTP(S) |
| `codebases/devtools/sms-inbox` | Serveur, interface et image Docker indépendants du métier et des bases DealPME |
| `notification.providers.ts` dans l'identité API | Sélection stricte des transports à partir de la configuration |

Le contrat d'envoi conserve destinataire, texte et catégorie, avec `delivery` optionnel :
`idempotencyKey`, `correlationId`, `expiresAt`. L'OTP fournit toujours sa clé de défi comme clé de livraison.
Le résultat est `ACCEPTED`, avec référence et nombre de tentatives ; ce n'est pas un accusé de remise opérateur.

## Budgets et erreurs

Valeurs par défaut : budget global **5 000 ms**, **1 500 ms** par tentative, au plus **3 tentatives**,
pause initiale **100 ms**. Paramètres `NOTIFICATION_TIMEOUT_MS`, `NOTIFICATION_ATTEMPT_TIMEOUT_MS`,
`NOTIFICATION_MAX_ATTEMPTS`, `NOTIFICATION_RETRY_DELAY_MS`.

- SMTP : TLS et authentification gérés par Nodemailer, avec fermeture effective de la connexion à
  l'annulation. Les refus temporaires connus peuvent être repris ; un résultat indéterminé après envoi
  n'est pas automatiquement retransmis. Un `Message-ID` identique ne garantit pas l'absence de doublon.
- Passerelle SMS : le même message et la même clé sont utilisés pendant les reprises. Ce contrat exige
  le dédoublonnage côté passerelle. La boîte locale le démontre, y compris après une acceptation dont la
  réponse a été perdue. Les accusés sont limités à 8 Kio et validés avant d'annoncer l'acceptation.
- Refus permanent, configuration invalide et expiration ne déclenchent pas une boucle d'envoi.
- Les erreurs sont normalisées : configuration, message invalide, destinataire refusé, limitation,
  indisponibilité, résultat inconnu ou expiration. Les détails techniques du fournisseur ne sont pas
  exposés dans la réponse d'authentification.

## OTP et interface

- Le code n'apparaît plus dans les réponses API/BFF, les paramètres d'URL ni un bandeau de développement.
  Le test et l'utilisateur consultent la boîte réellement utilisée.
- Inscription, défi et preuve restent transactionnels. Un échec de transport annule le défi ; la tentative
  échouée est auditée après rollback, sans contenu, code, téléphone ou adresse email dans les métadonnées.
- Le journal d'acceptation contient référence, état d'acceptation, simulation éventuelle et tentatives.
- Consommation unique, expiration et cinq essais de code sont conservés. Les émissions sont limitées à
  cinq par utilisateur sur dix minutes, en plus des limites d'inscription et de connexion.
- Après validation du mot de passe d'un compte non vérifié, la connexion propose un nouveau défi email.
  La page de vérification fournit le chemin de reprise ; aucune session n'est ouverte avant validation.
- Les pannes réseau du navigateur libèrent les boutons et conservent les saisies ; pas de succès simulé.

## Boîte SMS

La boîte garde au plus **1 000 messages pendant une heure** par défaut. Elle refuse de dépasser sa capacité
plutôt que d'effacer silencieusement un message non expiré. L'état `SIMULATED_ACCEPTED`, la corrélation,
le destinataire et l'estimation de segmentation sont visibles. La mémoire est perdue à l'arrêt : cet outil
n'est pas un journal durable de production.

`GET /messages` filtre par `toE164`, `category`, `correlationId`, `idempotencyKey`, `since` et curseur ;
`GET /messages/:id` lit un message ; `GET /health` expose la sonde.
`POST /messages`, `DELETE /messages` et `POST /test-controls` exigent le Bearer de `SMS_LOCAL_API_KEY`
(transmis au conteneur via `SMS_INBOX_API_KEY`). L'interface ne publie pas ce jeton.

Les contrôles simulent `rate-limit`, `unavailable`, `reject`, `timeout`, `accepted-timeout`, ou `none`,
avec nombre d'occurrences, délai et corrélation facultative. Les origines/hôtes étrangers sont refusés,
les corps sont bornés et les textes affichés par `textContent`. Le mode production est refusé par l'outil.
Le Dockerfile ne copie que les artefacts nécessaires ; ni `.env`, ni comptes locaux, ni sources métier.

## Basculer hors local

- Email : `CONNECTOR_EMAIL_PROVIDER=smtp`, hôte/port, expéditeur autorisé et identifiants. En production,
  TLS (direct ou STARTTLS obligatoire) et authentification sont exigés ; pas de repli en clair.
- SMS : `CONNECTOR_SMS_PROVIDER=generic-http`, `SMS_HTTP_BASE_URL=https://...` et `SMS_HTTP_API_KEY`.
  Le serveur doit implémenter le contrat JSON `/messages`, sa clé d'idempotence et l'accusé `ACCEPTED`.
  Une réponse explicitement simulée est refusée en mode réel.

Ce n'est pas une compatibilité universelle avec les APIs commerciales : si le fournisseur retenu utilise
un autre protocole, adapter la traduction et la tester, sans réécrire les parcours métier. Les clés seules
suffisent seulement lorsque le protocole est compatible. La réception réelle, les quotas, le sender ID
et les accusés opérateur restent à qualifier avec les accès attendus.

## Vérifier et suivre

```bash
npm run build
npx playwright install chromium
npm run ci:smoke
```

Le runner rejoue les 101 contrôles historiques, les 33 scénarios L02, puis 17 scénarios L03 dont quatre
navigateur. Les tests utilisent `devX/notification-inbox.mjs`, jamais un code extrait de la réponse API.
Les tests unitaires couvrent aussi le protocole SMTP simulé, le budget d'envoi, les mauvaises configurations
et la boîte HTTP. Rapports `.ci-artifacts/l03-results.json`, `smoke-results.json`, `gate-rejections.json`.

V1-101 est terminée. V1-093 et V1-102 sont en revue après validation locale ; leurs recettes fournisseurs
restent attendues. V1-028 conserve sa qualification SMS réelle ouverte. Le lot L04 peut avancer sur les
parties indépendantes. L'envoi métier d'alertes par le worker et son consentement relèvent encore de V1-096.
