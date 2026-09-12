# ADR 0008 — Audit transactionnel et conversations ciblées

Date : 12/09/2026. Statut : implémenté et vérifié dans L02 (V1-094, V1-095).
Preuve : [`qa/l02-verification.json`](../../qa/l02-verification.json).

## Contexte

L'audit était lancé sans attendre sa persistance, après plusieurs écritures métier déjà committées.
Une erreur pouvait donc laisser une action sans preuve. Les réponses du cédant n'avaient pas de
destinataire explicite et la politique RLS ne les rendait pas au repreneur concerné.

## Décisions

### Audit

- `AuditService.record(event, tx)` exige la transaction métier et retourne une promesse attendue.
  Action et événement réussissent ou sont annulés ensemble. Le cache de succès en mémoire est supprimé.
- `rejection(event)` écrit un refus indépendamment. Quand l'action utilise déjà une transaction, celle-ci
  est d'abord annulée : conserver deux connexions par refus saturerait le pool sous concurrence.
- Une panne du journal remonte explicitement en `INTERNAL / AUDIT_UNAVAILABLE`, sans exposer la requête
  SQL ni le contenu de l'événement. L'API ne confirme pas un succès dont la preuve n'est pas enregistrée.
- Inscription, défi initial et leurs preuves partagent la transaction. La consommation d'un OTP est
  conditionnelle et atomique avec la création de session ou la vérification d'email. Les compteurs de
  refus sont persistés séparément, avant la transaction d'authentification.
- Certification et clôture des demandes sont couplées. Les mutations des dossiers, faits, métadonnées
  de pièces, événements, consentements, alertes et messages attendent aussi leur audit transactionnel.
- Le lint typé de l'API refuse désormais une promesse ignorée, y compris avec `void`.

Les transactions couvrent PostgreSQL, pas une opération déjà effectuée chez un fournisseur. Un email ou
une création d'événement externe peut précéder un échec du commit ; aucune garantie d'« exactement une
fois » externe n'est déduite de cet ADR. Le dépôt de pièce tente de supprimer son objet privé si la
transaction de métadonnées échoue et journalise une référence de rapprochement si cette compensation
échoue. Les reprises de transport/fournisseur restent dans L03/L05.

### Conversations et autorisations

- Une `deal_conversation` par couple dossier/organisation repreneuse, avec parties immuables et intérêt
  préalable. Les intérêts historiques sont conservés, même s'ils sont multiples.
- Les nouveaux messages exigent un `conversation_id`. Une clé étrangère composite lie conversation et
  dossier. Le trigger vérifie les parties, l'auteur et l'éventuel intérêt d'origine.
- Le contexte RLS inclut désormais `app.user_id`. Lecture et écriture sont limitées aux parties ; un
  auteur ou un destinataire forgé est rejeté aussi en base.
- Le cédant fournit obligatoirement la conversation. Le repreneur peut omettre ce paramètre : le serveur
  choisit uniquement celle de son organisation. Aucune diffusion à tous les intéressés.
- Les réponses ne sérialisent ni identité ni identifiant d'organisation du repreneur en T0. Le sélecteur
  utilise une référence opaque, également affichée en face de chaque manifestation d'intérêt pour
  choisir le bon fil sans révéler l'identité. Les règles existantes de texte seul et de refus des coordonnées demeurent.

### Historique

La migration `0004_conversation_routing.sql` crée les fils à partir des intérêts existants. Elle renseigne
uniquement la nouvelle métadonnée de routage lorsqu'un intérêt explicite concorde avec le dossier et les
parties. Elle ne modifie ni corps, ni auteur, ni date, ni intérêt d'origine.

Une ancienne réponse sans destinataire explicite garde une cible nulle : elle reste consultable dans
« Historique non attribué — lecture seule », par le cédant ou son auteur initial. Aucun rattachement
fondé sur le seul fait qu'il n'y aurait aujourd'hui qu'un repreneur. Les nouvelles insertions sans cible
sont interdites ; l'exception historique ne devient pas un nouveau mode d'envoi.

La protection append-only existante est suspendue uniquement pour renseigner la nouvelle colonne dans
la transaction de migration, puis rétablie. Le test de mise à niveau rejoue un ancien schéma avec cette
protection active et compare intégralement les champs métier avant/après. Une exécution ultérieure de
`rls.sql` ne réintroduit pas l'ancienne politique de lecture globale.

### Webhooks

La signature Remo est contrôlée par une garde **avant le cache**. Une transaction sérialisée par clé
regroupe traitement, audit et réponse d'idempotence. Une empreinte lie la clé au corps de requête ; le
rejeu simultané ne crée pas de double effet. Une panne de la persistance de la clé annule aussi les effets.

Les anciennes réponses sans empreinte sont conservées mais leur rejeu renvoie 409 : on ne peut pas
attester que le nouveau corps correspond à la demande d'origine. Rapprocher ces anciennes livraisons
avant d'envisager une nouvelle clé ; ne pas relancer aveuglément un effet déjà appliqué.

## API et interface

Contrats partagés : `packages/contracts/src/messaging.ts`.

- `GET /v1/deals/:id/conversations` : sélecteur du cédant.
- `GET /v1/deals/:id/messages?conversationId=...&before=...&limit=...` : fil paginé.
- `GET /v1/deals/:id/messages?scope=legacy` : historique non attribué, paginé et en lecture seule.
- `POST /v1/deals/:id/messages` : `{body, conversationId?}`, schéma strict sans pièce jointe ni auteur libre.

Le BFF conserve les statuts d'erreur. Le hook client annule/ignore les lectures d'un ancien fil, borne
les requêtes et affiche l'erreur au lieu d'un faux état vide. Après envoi, seul le message confirmé par
le serveur est ajouté ; le brouillon reste présent si l'envoi n'est pas confirmé. Les contrôles de reprise,
pagination et sélection sont inscrits au registre. Le contrat V1 du bouton `CONTACT_SELLER` est explicité
à côté de sa référence corpus, sans réécrire celle-ci.

## Mise à niveau et vérification

Avant un déploiement sur une base existante : sauvegarder, arrêter les anciennes écritures, appliquer
les migrations avec le rôle propriétaire habilité, appliquer `rls.sql`, puis démarrer API et web mis à
jour ensemble. Les anciennes instances ne peuvent plus envoyer de messages sans cible après 0004.
Ne pas supprimer les nouvelles tables ou colonnes pour revenir à un ancien binaire : conserver les
nouvelles données et préparer une reprise cohérente.

```bash
npm run build
npx playwright install chromium
npm run ci:smoke
```

La commande crée une pile jetable et vérifie aussi 33 scénarios L02 : 27 base/API/migration/processus et
6 navigateur. Les injections de panne vérifient le projet Docker, le port et la base avant de s'exécuter.
Elles ne s'exécutent pas sur la base de travail. Le test d'arrêt brutal tue un processus API dédié,
pendant une transaction non committée, puis vérifie l'absence d'action et d'audit orphelins.

Les 101 contrôles de smoke précédents, les 74 tests unitaires, les builds et le contrôle des types restent
passants. La recette navigateur de ce lot concerne la messagerie ; la recette complète V1 reste en L07.
