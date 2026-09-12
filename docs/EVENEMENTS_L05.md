# L05 — événements : socle local et suite d'intégration

## État

Le socle front/backend local et son extension API/SAML sont éprouvés. L'adaptateur Remo fondé sur le
Swagger public, les invitations/intervenants/groupes, les visuels et le profil général DealPME ainsi que
le SSO SAML sont implémentés. **L05 garde ses sous-recettes fournisseur ouvertes** : adoption/configuration
du SSO commun, droits et quotas du compte, paramètres globaux non exposés par API et captation/export réels.
Guide actuel : [REMO_RACCORDEMENT.md](REMO_RACCORDEMENT.md).

Compléments désormais suivis sous IDs propres : **V1-110/111** (câblage et bascule sans accès),
**V1-112 à 115** (activation et recettes réelles) et **V1-116** (corrections/clôture du lot).
Ils restent ouverts à 0 %, indépendamment de la console V1-105 livrée. Détail, dépendances et dates
dans [le plan L05](PLAN_EXECUTION.md#8-l05--événements-administrés-depuis-dealpme).

Références et fiche de branchement : [INTEGRATION_REMO.md](INTEGRATION_REMO.md).

## Parcours livrés

- `/organisateur/evenements` : événements de l'organisateur, compte partagé et file diaspora.
- `/organisateur/evenements/nouveau` : brouillon, horaires UTC/Togo, capacité et personnalisation.
- `/organisateur/evenements/:id` : modification du brouillon avec révision, publication, reprise,
  annulation motivée et présences rattachées aux inscriptions.
- `/evenements` : inscriptions, consentement distinct et état de la salle.
- `/evenements/:id/acces` : admission contrôlée ou erreur lisible avec réessai.
- `/diaspora` : demande avec avis transfrontalier, statut et accès à l'entretien après confirmation humaine.

Une salle diaspora n'apparaît jamais dans la liste publique. L'accès exige une inscription nominative
ou le rôle d'organisateur de cette salle, le bon état et le créneau (ouverture quinze minutes avant).
Les identifiants historiques ne sont pas transformés en identifiants locaux ni considérés comme des
liens Remo réels. Les données antérieures restent conservées.

## Configuration locale

```dotenv
CONNECTOR_REMO_PROVIDER=local
REMO_LOCAL_BASE_URL=http://127.0.0.1:8028
REMO_LOCAL_API_KEY=dealpme-local-events
REMO_TIMEOUT_MS=3000
REMO_ACCOUNT_KEY=local-shared
REMO_MAX_CONCURRENT=2
REMO_MARGIN_MINUTES=10
REMO_ACCOUNT_BRAND_LABEL=DealPME
REMO_ACCOUNT_BRAND_ACCENT="#1C2751"
REMO_ACCOUNT_BRAND_WELCOME=Bienvenue à cette rencontre
REMO_ACCOUNT_BRAND_VERSION=local-v1
```

`npm run infra:up` construit le simulateur et son volume SQLite. Celui-ci est interdit en production.
Sans sélection, le fournisseur est `disabled`. La sélection `remo` utilise maintenant l'adaptateur du
Swagger public ; App Token, Company ID, compte distinct, HTTPS et référence de quota sont requis.

Le branding couvre le nom de marque, l'accent DealPME, le texte/média d'accueil, le logo et la couverture
par URL HTTPS publique. Le profil général est éditable dans DealPME par l'administration, avec versions
et surcharges événementielles. Les valeurs sont figées à l'enregistrement. Favicon, fond de connexion,
sous-domaine et emails globaux nécessitent l'initialisation du compte Remo : le Swagger n'en expose pas
les opérations d'écriture. Les visuels d'événement, eux, sont envoyés par l'adaptateur.

## Réservation et synchronisation

Le registre partagé distingue compte, produit et ressource. La ligne du compte est verrouillée pendant
le calcul du pic de chevauchement et l'insertion de réservation. Les marges sont comprises dans les
intervalles ; les bornes communes comptent ensemble conformément à la documentation publique Remo.
Le quota local de deux sert aux tests, pas à décrire l'abonnement possédé.

La publication persiste d'abord clé et réservation, appelle ensuite le fournisseur et confirme enfin
résultat et audit. Un résultat incertain reste `SYNC_UNKNOWN` avec réservation conservée. Le rapprochement
réutilise la clé de publication. Après interruption d'une opération, attendre soixante secondes avant
de reprendre. L'annulation ne libère le créneau qu'après confirmation du simulateur ; celui-ci conserve
une marque d'annulation qui bloque une création tardive avec la même clé.

Les créations hors de ce registre ne sont pas couvertes. Les autres produits doivent utiliser le même
registre pour partager la garantie. Les modifications de planning après publication passent actuellement
par annulation puis nouvel événement ; la modification distante en place attend le contrat réel.

Les places sont contrôlées par un verrou événement et un trigger PostgreSQL ; le compteur public est
un agrégat dédié, sans exposer les noms ni dépendre de la visibilité RLS de l'appelant. Les présences sont
enregistrées à l'entrée effective dans le simulateur, puis rapprochées sur action de l'organisateur.
Le webhook HMAC/idempotent existant reste disponible comme contrat local. Une référence inconnue est
auditée sans être attribuée arbitrairement à une inscription. Son protocole réel dépend encore de Remo.

## Prototype de captation

Le navigateur joue un participant autorisé dans une salle locale. Après consentement explicite, un
signal audio **généré** est capté par MediaRecorder. La révocation de la salle arrête la captation ;
preuve : session, taille, empreinte, timestamps et motif d'arrêt dans `l05-capture-results.json`.
Ce test ne démontre ni captation de voix Remo, ni navigation live entre tables, ni transcription ou résumé.

La documentation Remo annonce désormais des transcripts natifs par table/scène et un export ZIP.
Cette option doit être éprouvée avant de retenir un agent pour toute la captation. L'activation en mode
conversation porte sur **toutes** les tables : elle devra être compatible avec les consentements et
la confidentialité des sessions, et ne peut pas être présentée comme une captation sélective par table.

## Recette et suite

`npm run ci:smoke` crée une pile jetable, rejoue L01–L04 puis les scénarios L05. Les tests couvrent
publication concurrente, autres produits sur le compte, reprise après timeout, capacité d'inscription,
admission/présence, diaspora privée, navigateur et capture synthétique. Le test de restauration L04
couvre aussi les nouvelles tables (49 tables au total dans les trois bases à ce stade).

Suite L05 : configurer le compte reçu et ses métadonnées SAML, rejouer la matrice contre le fournisseur,
vérifier les profils/contacts et les paramètres globaux, puis éprouver la captation et les exports réels.
A17/A18/A21 restent ouverts. Aucune date de version ni tâche historique n'est déplacée.
