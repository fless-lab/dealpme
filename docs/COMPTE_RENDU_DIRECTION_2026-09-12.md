# Réunion direction — décisions produit et suites techniques

Prise en compte : **12/09/2026**, à partir de la transcription fournie par Abdou-Raouf. Les horodatages
ci-dessous sont relatifs à l'enregistrement. Certains noms de solutions sont mal transcrits : ils restent
à confirmer. Cette synthèse porte sur les sujets projet et n'attribue pas une capacité technique à un
fournisseur sur la seule base d'une remarque orale.

Suite opérationnelle : [plan d'exécution](PLAN_EXECUTION.md), onglet `Plan_execution` du classeur,
[architecture locale](INTEGRATIONS_LOCALES.md), [demande serveur et accès](DEMANDE_INFRA_ACCES.md).

## 1. Décisions et orientations retenues

| Référence | Sujet et conclusion | Traduction dans le suivi |
|---|---|---|
| 12:50–18:50 | Deal-Connect intégré dès V1 ; créer les événements depuis DealPME par API. Un accès participant n'est pas un accès organisateur/développeur. L'accès API est annoncé dans le package. | V1-067/068 déjà présents ; prototype de qualification V1-104 et console organisateur V1-105 ajoutés ; A17 ouvert |
| 20:08–21:56 | L'intégration existe comme socle ; il faut des accès rapides pour éprouver l'authentification et le parcours d'entrée. | Conserver les acquis ; tester SSO/lien individuel au lieu de le présumer |
| 22:01–30:26 | Besoin d'un rapport sur **ce qui a été dit**, au-delà des inscriptions/présences. Proposition d'un agent participant, avec essai de faisabilité. | V1-107 prototype ; V2-048/049/050 captation, transcription, résumé et recette ; A21 ouvert |
| 30:38–31:27 | Concevoir les briques réutilisables pour d'autres produits. | Ports génériques, contexte produit/compte, adaptateurs et tests communs ; pas de duplication du métier DealPME |
| 31:43–32:45, 49:46–51:30 | Cartographier les documents et étudier en profondeur le VDR et les interfaces de services. | V1-103 ; références d'implémentation utilisées au début de chaque lot |
| 33:16–35:02 | Préférence pour une vérification CFE/RCCM automatisée ; disponibilité réelle d'une API non confirmée. | A02 actualisé ; V1-035 conservé ; précision ultérieure du chef de projet : mock et mode manuel V1-109 |
| 35:17–37:26 | Références existantes comme direction de design. Évaluer l'apport du designer avant d'intégrer ses propositions. | D07 ; V1-075 précisé, A03 en discussion ; la présence du designer n'est pas un préalable à toute intégration |
| 38:00–40:39 | Créer une mini-réunion liée au dossier pour plusieurs repreneurs intéressés. | V2-047 ; invitations privées et droits de divulgation ; l'analogie avec une enchère ne crée pas de fonctionnalité d'enchères |
| 40:47–44:43 | Branding par événement, compte mutualisable entre produits ; capacités et limites de l'offre à vérifier. Une limite « one event at a time » est évoquée. | V1-104/106 ; A18 ouvert ; ne pas coder les quotas d'après la transcription |
| 45:13–47:33 | Tester la meilleure option parmi les abonnements disponibles, Remo restant la piste prioritaire. | Comparatif limité aux besoins réels dans V1-104 ; noms/liens et accès demandés en A17 |
| 49:04–51:30 | TaxeFacile confirmé comme service sélectionnable ; même logique de profil prestataire, inscription, screening et validation. | A06 tranché sur le nom/périmètre service ; D06 ; V3-048/049/050 ; modalités techniques ouvertes en A20 |
| 51:45–52:30 | Antivirus intégré à l'environnement, pour éviter les échanges de fichiers vers un service distant systématique. | D08 ; ClamAV est déjà intégré au socle, V1-025/047 restent acquis ; revalidation dans les tests de livraison |
| 52:30–52:56 | Agents robustes face aux instructions hostiles placées dans les documents. | V2-050 pour les rapports de réunions ; exigences V5 existantes pour DealLens conservées |
| 53:57–55:50 | Prévoir un serveur dédié à DealPME et aux services associés, notamment TaxeFacile ; envoyer les spécifications. Hostinger évoqué, ressources non confirmées. | V1-108, A19 ; V1-009 reste le déploiement ; proposition de configuration et courriel préparés |

## 2. Précisions du chef de projet après la réunion

- **Email/SMS local** : Mailpit et boîte SMS locale, utilisables dans les parcours et les tests ; bascule
  vers les fournisseurs via des adaptateurs configurés et testés (D11, V1-101/102).
- **CFE** : `CFE_API_ENABLED=false` donne une validation manuelle complète ; activé avec fournisseur `mock`
  appelle un simulateur local ; activé avec fournisseur réel utilise son contrat documenté (D10, V1-109).
- **Calendrier** : aucune extension des dates des versions ; les tâches existantes et leurs acquis sont
  conservés. Les besoins nouveaux sont ajoutés sous de nouveaux identifiants.
- **Exécution** : établir le plan complet, puis suivre les lots dans l'ordre, avec des preuves avant
  clôture. Les tâches d'implémentation ajoutées ici ne sont pas déclarées terminées parce que le plan existe.

## 3. Ce qui est confirmé, et ce qui reste à vérifier

### Confirmé comme orientation produit

Création d'événements depuis DealPME, branding par événement, mini-réunions liées au dossier, intérêt pour
les rapports de contenu, réutilisabilité, TaxeFacile dans les services, base de design fournie, antivirus
intégré et demande d'un serveur dédié. Le mode CFE manuel/mock et le SMS local sont confirmés par le chef
de projet dans l'échange qui suit.

### Non démontré techniquement

- Droits organisateur/admin réellement obtenus, nombre de sièges d'administration, clés et périmètres API.
- SSO disponible et utilisable avec l'offre possédée ; entrée unique ne révélant pas de contenu privé.
- Nombre d'événements simultanés ; quota commun à tous les produits ou propre à un événement.
- Limites orales « 300 participants », « six heures », « 24 par table », « 50 speakers », « six assistants ».
  Elles sont des points à vérifier, pas une configuration contractuellement validée.
- Possibilité de personnaliser un événement indépendamment de la marque du compte.
- Enregistrement de la scène **et** des tables, export API, transcript, accès de l'agent et captation de
  plusieurs sessions simultanées. Un stockage d'enregistrements illimité ne prouve aucun de ces points.
- APIs CFE/RCCM, TaxeFacile ou d'attestation fiscale ; contrat du moteur de transcription/résumé.
- Caractéristiques du serveur Hostinger existant, son renouvellement, son budget et les accès.

Vérification publique ponctuelle : le site [remo.co](https://remo.co), consulté lors de cette préparation,
présente la marque « Remo by Events » et renvoie au support `help.virtual.events.com`. Cela rend cohérente
la désignation orale Events.com Virtual, mais ne confirme pas le contenu de l'abonnement possédé.
Les autres noms évoqués (GoBrunch, nom transcrit « BeHuman », autre solution non identifiée) sont à
confirmer par leurs liens officiels et les comptes réellement disponibles.

## 4. Matrice de couverture : réutiliser avant d'ajouter

| Besoin | Déjà suivi | Complément réellement manquant |
|---|---|---|
| Lint/builds bloquants | V1-091 | Aucun nouvel item |
| Réponse ciblée et audit durable | V1-095/094 | Aucun nouvel item |
| Email SMTP et alertes | V1-093/096 | V1-101 boîte SMS ; V1-102 contrats, bascule et OTP |
| CFE manuel/API | V1-035 | V1-109 mock HTTP et sélection complète par environnement |
| Accès et connecteur Remo | V1-007/067/068 | V1-104 preuves sur l'offre ; V1-105 console organisateur ; V1-106 quotas partagés |
| Rapports statistiques d'événement | Rapport P20 déjà en V4 | V1-107 prototype de captation ; V2-048/049/050 socle de contenu ; V4-026 extension multi-sessions |
| Rendez-vous diaspora | V1-071 | V2-047 mini-réunions liées à un dossier, cas distinct |
| Documentation et design | V1-089 acquis ; V1-075 revue | V1-103 carte transversale sources/tâches/écrans/tests |
| VDR, signature et DealLens | Tâches V2 et V5 existantes | Préciser les lots et utiliser le corpus ; pas de recopie de tâches déjà présentes |
| Antivirus | V1-025/047 acquis | Aucun nouveau moteur ; tests de régression dans L07/L08 |
| Déploiement | V1-009 | V1-108 dimensionnement et validation des accès serveur |
| Fiscalité/Experts | Module fiscal V3 et missions EXP V4 | V3-048 catalogue ; V3-049 profil prestataire partagé ; V3-050 parcours TaxeFacile |

**17 ajouts**, aucun retrait. Affectation technique proposée et inscrite : neuf en V1, quatre en V2,
trois en V3, un en V4. V5 conserve son périmètre. Toutes les dates de versions sont maintenues.

## 5. Articulation avec le corpus

Le cahier des charges v0 et le référentiel P04–P25 restent les bases métier. Le Master Handoff fournit
les références de surfaces et de recette ; ses copies de commodité ne constituent pas des versions de
production. Le fichier `Dealpme services summary.md` appartient au blueprint v5 écarté en D01 : la réunion
confirme le service TaxeFacile, elle ne réintroduit pas globalement escrow, certification automatique,
biométrie ou valorisation DealPME présents dans ce blueprint.

Automatiser la consultation du registre ne signifie pas automatiser Deal-Ready. Créer une mini-réunion
ne signifie pas publier un dossier titres : son accès et ses comptes rendus doivent respecter les paliers.
Réutiliser un profil prestataire ne signifie pas partager sans contrôle les données métier de TaxeFacile
et de la VDR. Ces distinctions guident les critères des tâches ajoutées.
