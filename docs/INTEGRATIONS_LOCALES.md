# Notifications locales et intégrations réutilisables

Notifications L03 : **implémentées et vérifiées en local**, voir [NOTIFICATIONS.md](NOTIFICATIONS.md).
La qualification des fournisseurs réels reste ouverte. Le CFE manuel/mock et les alertes persistées
sont implémentés en L04 : voir [EXPLOITATION_L04.md](EXPLOITATION_L04.md). Les sections événements/captation
restent des conceptions pour les lots suivants. Référence de départ : `2dd4e3d`, réunion du 12/09/2026.

## 1. Objectif email et SMS

Développer et tester les vrais parcours d'envoi sans compte fournisseur, puis conserver la logique
métier lors de la bascule. Les contrats `EmailPort` et `SmsPort` existent déjà dans
`codebases/external_connectors/`. Les faux actuels restent utiles aux tests unitaires.

Le dispositif local cible est :

```text
API / worker
  ├─ EmailPort → adaptateur SMTP → Mailpit → boîte email web + API de test
  └─ SmsPort   → adaptateur HTTP local → sms-inbox → boîte SMS web + API de test

Hors local
  ├─ EmailPort → SMTP authentifié ou adaptateur API du fournisseur retenu
  └─ SmsPort   → adaptateur du fournisseur SMS retenu
```

Mailpit est dans Compose (SMTP 1025, interface 8025) et l'identité l'utilise désormais réellement.
`SmsPort.send({toE164, text, category})` retourne déjà une référence fournisseur : aucun vendeur ne
doit apparaître dans les services métier d'identité, de certification ou de matching.

**Limite de la promesse « changer les clés » :** pour un transport SMTP compatible, la configuration
suffit généralement. Pour le SMS, les APIs ne sont pas standardisées : il faut d'abord écrire et tester
l'adaptateur correspondant au fournisseur retenu. Ensuite, activer cet adaptateur se fait par paramètres
de déploiement, sans réécrire les parcours. Aucun fournisseur précis n'a été validé pendant la réunion.

## 2. Boîte SMS locale retenue pour le plan

Un petit outil HTTP indépendant, `codebases/devtools/sms-inbox`, réutilisable sur les autres produits.
Il simule la réception des messages envoyés à la passerelle ; il ne prétend pas envoyer un SMS sur un
téléphone ni simuler la qualité du réseau opérateur. Pas de connexion à la base métier DealPME.

Pourquoi ce choix : il couvre exactement le port existant sans imposer une API commerciale avant le
choix fournisseur. L'outil doit rester une boîte de test légère, pas devenir une passerelle télécom.

### Contrat local implémenté

| Route | Usage |
|---|---|
| `POST /messages` | Recevoir `toE164`, `text`, `category`, identifiant de corrélation et clé de dédoublonnage ; répondre 201 avec `providerRef` |
| `GET /messages` | Liste paginée, filtre destinataire/catégorie/corrélation/date ; utilisée par le navigateur et les tests |
| `GET /messages/:id` | Détail du message, texte rendu comme texte, jamais exécuté en HTML |
| `DELETE /messages` | Réinitialisation explicite des données de test |
| `POST /test-controls` | Configurer une réponse 429, 5xx, timeout ou refus pour le prochain test |
| `GET /health` | Vérifier la disponibilité du simulateur |

Interface web : liste des numéros, contenu, catégorie OTP/transactionnel/marketing, référence et heure.
Le stockage de test est borné, avec expiration et réinitialisation ; les exécutions CI ont chacune leur
espace de données. Prévoir des scénarios Unicode/segmentation, sans annoncer une facturation opérateur.

Exposer par défaut l'interface sur `127.0.0.1:8026`. Le serveur écoute sur son réseau Docker interne pour
les appels API/worker. Utiliser un profil Compose de développement ; exclure la boîte et ses routes de
contrôle du déploiement cible. Les messages de démonstration sont synthétiques.

### Configuration cible proposée

Ces paramètres sont présents dans `.env.example` et validés dans `config/env.ts` :

```dotenv
CONNECTOR_EMAIL_PROVIDER=mailpit
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=notifications@demo.dealpme.local

CONNECTOR_SMS_PROVIDER=local
SMS_LOCAL_BASE_URL=http://localhost:8026
NOTIFICATION_TIMEOUT_MS=5000
```

En Docker, les hôtes deviennent `mailpit` et `sms-inbox`. Pour un SMTP réel : hôte, port, mode TLS,
utilisateur et secret du fournisseur, plus expéditeur autorisé. Pour le SMS réel : sélection du fournisseur,
URL configurée si son adaptateur le permet, clé, sender ID et paramètres spécifiques documentés.
Un fournisseur inconnu ou incomplet fait échouer le démarrage ; aucun repli silencieux vers `fake`.

## 3. Livraison, erreurs et dédoublonnage

1. Garder la création/vérification OTP dans l'identité ; les transports ne valident aucun code.
2. Appliquer un timeout borné aux appels et traduire les erreurs en codes stables : configuration,
   destinataire refusé, limite de débit, indisponibilité, résultat indéterminé.
3. Réessayer uniquement les erreurs temporaires, avec budget et temporisation. Ne pas réessayer un OTP
   expiré, ni créer un nouveau code à chaque tentative de transport.
4. Pour les notifications asynchrones, persister l'intention et les tentatives. La même intention garde
   sa clé d'idempotence. Réévaluer le consentement et le palier au moment d'envoyer, pas seulement à la
   mise en file.
5. Un timeout après acceptation peut laisser le résultat inconnu. Utiliser l'idempotence/réconciliation
   du fournisseur lorsqu'elle existe ; ne pas promettre un envoi « exactement une fois » avec une API
   qui n'offre pas cette garantie.
6. Séparer « accepté par la passerelle » de « remis au destinataire ». Une remise réelle n'est attestée
   que par un accusé compatible et authentifié. Le simulateur étiquette ses statuts comme simulés.
7. Les logs techniques portent références, résultat et corrélation, pas le code OTP ni le corps du message.

La consommation atomique des OTP est en place depuis L02. L03 vérifie l'envoi par les transports locaux,
le rollback d'un défi non confirmé et la trace d'échec. Les codes ne sont plus exposés dans l'API ou le BFF.

## 4. Recette du lot notifications

| Test | Preuve attendue |
|---|---|
| Inscription email | Code récupéré dans l'API Mailpit, vérification puis connexion possibles |
| MFA officier | Code récupéré dans sms-inbox, session créée après validation seulement |
| Numéro et destinataire | Numéros E.164, destinataire exact et corrélation vérifiés |
| Code expiré, faux ou réutilisé | Refus ; deux validations simultanées ne consomment pas deux fois le défi |
| Transport indisponible | Erreur explicite, attente bornée, pas de faux succès ni code inutilisable présenté comme livré |
| Rejeu du job | Une intention, tentative tracée et pas de double envoi dans le transport à idempotence testée |
| Consentement révoqué | Aucun nouvel envoi marketing/alerte, même si le job était déjà en file |
| Bascule fournisseur | Même suite de contrats exécutée contre l'adaptateur HTTP de test puis le sandbox réel |
| Configuration cible | Les modes `fake`/`local` et les retours `devCode` ne sont pas exposés hors environnement de test |

Les tests de parcours lisent maintenant les boîtes via `devX/notification-inbox.mjs` ; le smoke et les
scénarios L02 sont migrés. Les tests unitaires gardent les faux en mémoire. Les tests sandbox opérateur
restent rattachés à V1-028 ; la boîte locale ne clôt pas l'intégration du fournisseur réel.

Tâches : V1-093 (SMTP), V1-101 (boîte SMS), V1-102 (contrats/bascule/OTP), V1-028 (opérateur réel),
V1-096 (alertes), V1-100 (recette navigateur).

## 5. Événements et compte fournisseur réutilisable

Conserver `RemoPort` et le connecteur existant comme point de départ. Le code métier manipule un événement,
une session, une réservation et un profil de branding ; il ne construit pas de route fournisseur.
Le périmètre exact du port évolue à partir des APIs effectivement vérifiées, pas de l'intitulé « API access ».

Prévoir : `providerAccountId`, `productKey`, `eventId`, `sessionId`, référence externe, intervalle UTC,
capacité et version du profil de branding. Les clés du compte restent côté serveur. Un compte fournisseur
peut être mutualisé sans mélanger les participants, pièces ou rapports des différents produits.

**Ressource partagée :** si l'abonnement ne permet qu'un événement actif, une réservation atomique doit
empêcher deux créations concurrentes incompatibles. Définir la marge de préparation/fin et les états
réservé, confirmé, annulé, inconnu. Un succès fournisseur suivi d'un timeout doit pouvoir être rapproché.
La limite est configurable d'après le contrat vérifié, jamais codée en dur à 1 ou 300.

La garantie ne couvre que les réservations passant par le même registre. Les créations directes chez le
fournisseur ou depuis d'autres produits doivent être synchronisées si l'API le permet ; sinon la limite
de couverture est explicitée et une coordination commune est nécessaire. Ne pas annoncer une exclusion
mutuelle globale à partir d'un compteur local à DealPME.

Le branding d'événement est distinct de la marque du compte ; vérifier les deux sur un événement test.
Un simple lien public ou un iframe ne démontre ni SSO ni confidentialité. Les réunions liées à un deal
ne réutilisent pas la publication publique des salons.

## 6. Captation et comptes rendus de réunions

La direction propose un agent participant ; l'étude V1-107 doit éprouver ce chemin et comparer les
exports/enregistrements natifs réellement disponibles. Aucun endpoint de transcription fournisseur n'est
supposé exister. La capacité à enregistrer la scène ne démontre pas la captation des conversations aux tables.

Frontières proposées :

- Contrats génériques de captation dans les bibliothèques partagées, sans dépendance aux tables de deal.
- Connecteur `meeting-capture` : accès participant autorisé, état de connexion, capacité par session,
  arrêt, reprise et références des enregistrements. Pas de moteur vidéo propriétaire.
- Worker : ingestion, scan local, transcription si moteur autorisé, segmentation et rapport.
- Intégration DealPME : autorisations, participants, divulgation, audit et distribution.

Schéma minimum : origine produit/compte, événement/session, personnes autorisées, consentement de captation,
segments horodatés, langue, source/version/hash, intervenant connu ou inconnu, niveau de couverture et
motif de segment manquant. Aucun rapport ne doit inventer ce qu'une captation partielle n'a pas entendu.

Un agent par session peut être nécessaire : vérifier la navigation entre salles, le budget de connexions,
la capacité maximale incluant les agents et les collisions avec les autres événements. Conserver un import
contrôlé de transcript comme chemin de recette du pipeline ; cet import ne valide pas le connecteur live.

Pour les résumés : citations vers segments, brouillon, validation humaine, publication et notification avec
lien d'accès contrôlé. Les destinataires sont résolus depuis les droits et la participation à la session ;
une inscription au salon entier ne donne pas accès à toutes les conversations. Un transcript privé de deal
reste soumis aux mêmes droits ; les notifications ne transportent pas de contenu confidentiel en clair.

Les documents/transcripts sont des données non fiables : leur texte ne peut ni changer les instructions
de l'agent, ni déclencher une commande, ni ajouter des destinataires. Tester injection, fuite inter-session,
révocation, langue incorrecte, sources manquantes, panne du modèle, reprise et double diffusion.

V2-048/049 prévoient captation/transcription/résumé. Un fournisseur de traitement autorisé pour les
événements doit être qualifié avant usage réel (A21) ; le contrat DealLens J16 reste inchangé. Un compte
rendu manuel ou structuré peut avancer sans fournisseur IA, mais ne ferme pas la tâche de résumé automatique.

Réutiliser ce socle en V4 pour les rapports de contenu multi-sessions. DealLens documentaire, ses citations
par page, Evidence Map et Clean Team restent le périmètre V5 défini dans le corpus.

## 7. CFE / RCCM : mock HTTP, API réelle ou instruction manuelle

Clarification du chef de projet : API désactivée par environnement = validation manuelle complète ;
API activée = mock local en attendant les accès, puis adaptateur réel. Tâche complémentaire V1-109,
rattachée au travail existant V1-035. La vérification de registre ne remplace pas la décision Deal-Ready.

### Sélection implémentée (L04)

```dotenv
CFE_API_ENABLED=false
CONNECTOR_REGISTRY_PROVIDER=mock
CFE_API_BASE_URL=http://localhost:8027
# CFE_API_KEY est requis seulement par l'adaptateur réel si son contrat le demande.
```

| Activation | Fournisseur | Comportement |
|---|---|---|
| `false` | quelconque | Aucun appel réseau ; file CCI et résultat manuel avec officier, source et date |
| `true` | `mock` | Appel HTTP au simulateur local, réponses synthétiques explicitement identifiées |
| `true` | `cfe` | Démarrage refusé tant que le contrat réel et son adaptateur ne sont pas qualifiés (A02) |
| valeur invalide / fournisseur inconnu | — | Configuration refusée explicitement |

`CFE_API_ENABLED` devient la source de sélection. Migrer l'ancien `CONNECTOR_REGISTRY_MODE=manual|api`
avec une règle documentée : ancien paramètre accepté uniquement si le nouveau est absent ; conflit
refusé. API désactivée ne doit exiger ni clé ni URL joignable. Les valeurs booléennes sont strictes,
pas converties silencieusement depuis une faute de frappe.

### Mock et contrat

- Conserver `RegistryPort`, enrichir les résultats pour distinguer entreprise introuvable, réponse
  indisponible et incohérence. Un `found=false` n'est pas une panne réseau.
- Créer `codebases/devtools/registry-mock`, indépendant de la base métier, interface/API locale 8027.
  `POST /lookups` reçoit le numéro RCCM/CFE normalisé ; `GET /scenarios` documente les identifiants de test.
  Ce sont des routes de mock à créer, pas des routes prétendues de l'administration.
- Scénarios déterministes : société correspondante, introuvable, dénomination divergente, radiée,
  résultat incomplet, réponse malformée, délai dépassé, 429 et 5xx. Le scénario est défini dans le
  simulateur, jamais par un champ libre que l'utilisateur pourrait envoyer à l'API de production.
- Conserver séparément le déclaratif et les preuves de consultation : numéro, source, référence,
  horodatage, fournisseur, mode, origine synthétique et auteur éventuel. Une bascule de mode ne réécrit
  pas les consultations antérieures et ne transforme pas une preuve mock en preuve CFE réelle.
- Quand la véritable API sera documentée, son adaptateur traduira les requêtes/réponses vers le même
  contrat. Changer URL et clé ne suffit que si le protocole est effectivement compatible.

### Parcours manuel et incidents

L'officier voit la file, les données déclarées, les éléments du registre et leur provenance. Il peut
confirmer, signaler une divergence, demander un complément ou refuser avec motif. Référence de source et
officier obligatoires. Aucune consultation réseau n'est tentée en mode manuel ; l'absence de formulaire
complet donne une erreur de validation, pas l'appel au faux `lookup` actuellement non implémenté.

API active mais indisponible : conserver un état à vérifier et proposer une reprise manuelle **explicite**
avec motif, officier et source. Pas de confirmation automatique sur timeout. Réévaluer une preuve devenue
obsolète lorsque le numéro ou les données d'identification changent ; conserver son historique sans
maintenir abusivement le prérequis de certification.

### Critères de validation

1. API désactivée : compteur d'appels réseau à zéro ; cycle manuel complet, source et décision visibles.
2. API activée/mock : correspondance, absence, divergence et incident conduisent à des états distincts.
3. API activée/réelle : contrat validé en sandbox dès que disponible ; mock interdit dans la cible réelle.
4. Permissions : un cédant ne peut pas valider son propre registre ; isolation entre organisations.
5. Rejeu/consultations concurrentes : provenance conservée, pas de duplication de décision ni de perte
   du résultat le plus récent ; aucune certification sans décision nominative séparée.
6. Interface : modes et provenance affichés, erreurs et reprise manuelle testées sur desktop/mobile.
7. Changement de mode : données historiques et acquis conservés, nouvelle consultation correctement typée.
