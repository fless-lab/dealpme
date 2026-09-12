# Plan d'exécution DealPME — V1 à V5

**Révision : 12/09/2026, après réunion direction et clarification CFE.**

**État : L01/L02 vérifiés ; L03/L04 opérationnels en local, recettes fournisseurs et serveur encore ouvertes.**
Le prochain lot technique est **L05**. [Usage des notifications](NOTIFICATIONS.md),
[exploitation L04](EXPLOITATION_L04.md), [preuves locales L04](../qa/l04-verification.json).
Preuves et commandes de reprise : [CI.md](CI.md) et [qa/l01-ci.json](../qa/l01-ci.json).
Les autres lots restent à réaliser ; les acquis historiques sont conservés.
L02 : [décision d'implémentation](adr/0008-audit-et-conversations.md) et [preuves](../qa/l02-verification.json).

Sources : [bilan initial](BILAN_AVANCEMENT_2026-09-12.md), [réunion](COMPTE_RENDU_DIRECTION_2026-09-12.md),
[contrats des intégrations locales](INTEGRATIONS_LOCALES.md), [serveur et accès](DEMANDE_INFRA_ACCES.md).
Le classeur `DealPME_Suivi.xlsx` est le suivi partagé ; son onglet `Plan_execution` relie chaque tâche
restante à un lot unique et calcule sa progression depuis `Taches`.

## 1. Cadre de travail

- Les **75 tâches V1 complétées** et tous les acquis sont conservés ; correctifs et extensions ont leurs
  propres tâches. Les 242 identifiants existants et leurs dates sont préservés.
- 17 tâches supplémentaires issues de la réunion et des besoins locaux : 9 V1, 4 V2, 3 V3, 1 V4.
  Total : **259 tâches**, charge de référence **1 043 j/p estimés**. Les 75 j/p ajoutés sont une estimation
  de périmètre supplémentaire, pas une consommation réelle ni une prolongation de calendrier.
- Dates inchangées :

| Version | Début | Fin | Charge totale après ajouts |
|---|---|---|---:|
| V1 | 03/09/2026 | 15/10/2026 | 332 j/p |
| V2 | 16/10/2026 | 25/11/2026 | 228 j/p |
| V3 | 26/11/2026 | 30/12/2026 | 219 j/p |
| V4 | 31/12/2026 | 05/02/2027 | 111 j/p |
| V5 | 06/02/2027 | 28/02/2027 | 153 j/p |

- L'ordre des lots est technique ; les dates du classeur restent le calendrier de livraison convenu.
  L00 collecte les accès en parallèle. Un fournisseur absent ne doit pas empêcher les parties locales
  indépendantes ; sa recette réelle reste explicitement ouverte.
- Un seul lot technique principal à la fois. À l'intérieur du lot : contrat → données/migration → API ou
  worker → interface → tests → documentation → statut → commit. Ne pas commencer plusieurs refontes en parallèle.
- Après chaque lot, noter tâches terminées, preuves, points ouverts et **première action de reprise**.
  Cela permet de reprendre rapidement le travail sans reconstruire le contexte.
- Ne pas recopier la logique de métier dans des mocks, ni considérer un mock comme une preuve d'intégration réelle.

## 2. Ordre global et sorties attendues

| Lot | Sujet | Sortie concrète |
|---|---|---|
| L00 | Références, accès, serveur | Sources localisables et demandes externes suivies |
| **L01** | CI | Chaque défaut de lint/build/test bloque réellement |
| L02 | Messagerie + audit | Réponse au bon repreneur et traces durables |
| L03 | Email + SMS | OTP reçu dans les boîtes locales ; contrats prêts pour fournisseur |
| L04 | CFE + alertes + exploitation | Mode manuel/mock complet, notifications et staging reproductible |
| L05 | Événements + prototype de captation | Organisation depuis DealPME et limites fournisseur éprouvées |
| L06 | Interface + fidélité | Parcours accessibles, contrôles documentés, captures validées |
| L07 | Recette V1 | Démonstration complète rejouable et validée |
| L08 | RPS + NDA + VDR | Un document autorisé puis réellement révoqué, avec toute la chaîne d'accès |
| L09 | Réunions + rapports | Captation, résumé sourcé et distribution limitée aux bons participants |
| L10 | V3 | Transaction, services/prestataires, TaxeFacile, paiements et exploitation |
| L11 | V4 | Services étendus et rapports de salon par session |
| L12 | V5 | DealLens et intelligence VDR gouvernée |

## 3. L00 — préparation continue des références et accès

Tâches : **V1-067, V1-103, V1-108**. Coordination : chef de projet avec directeur, CCI et fournisseurs.
Les questions ouvertes ne bloquent pas L01.

### Actions

1. Envoyer le courriel préparé dans `DEMANDE_INFRA_ACCES.md` ; suivre réception des accès, sans stocker
   les secrets dans le classeur. Distinguer accès participant, organisateur, administration et API.
2. Confirmer l'offre événementielle réelle, les autres abonnements et les quotas (A17/A18).
3. Valider serveur, DNS et sauvegarde (A19), contacts CFE (A02), transport email/SMS (A16), TaxeFacile (A20),
   captation/transcription/résumé (A21), signature/archivage PSC/PSAE.
4. Construire une carte exhaustive des familles de ressources : source principale, doublons, version,
   module concerné, exigences, écrans et tests. Marquer les documents à lire, lus et contradictoires.
5. Avant un lot, ouvrir ses références et ses fixtures. Une archive inventoriée n'est pas nécessairement
   entièrement relue ; compléter la matrice avec la preuve de lecture utile à l'implémentation.

### Repères déjà vérifiés dans les ressources

Racine `R` : `ressources/DEALPME-20260909T190445Z-1-001/DEALPME/`.
Handoff `H` : `R/DealPME_V_MASTER_DEVELOPER_HANDOFF/DealPME__MASTER_DEVELOPER_HANDOFF/`.

| Besoin | Source à ouvrir |
|---|---|
| Périmètre, interdits, intégrations | `H/01_SOURCE_BASIS/01_DealPME_v0_Approved_Build_Specification.pdf` |
| Processus et responsabilités CCI | `R/DealPME_Referentiel_Processus_P04-P25_Contractuel_v1.0_2026.pdf` |
| Autorité des copies | `H/00_START_HERE/VERSION_AUTHORITY.md` et `TRACEABILITY_MAP.md` |
| Contrats d'interaction / données | `H/03_DEVELOPER_GUIDES/02_DEVELOPER_IMPLEMENTATION_STANDARD.md` |
| Recette | `H/03_DEVELOPER_GUIDES/04_RELEASE_GATE.md` |
| VDR | Guides `01_VDR_IMPLEMENTATION_GUIDE.md`, `03_ACCESS_STATE_MATRIX.md`, `07_VDR_INTERACTION_REGISTRY.*`, `08_VDR_DESIGN_SYSTEM.md` |
| Référence exécutable | `H/04_EXECUTABLE_REFERENCE/DealPME_V3_Release/`, dont PT-001 et les scénarios de services |
| Marque et déclinaisons | `R/DEALPME Brand Guidelines Kit.pdf`, `DEALPME Brand templates.pdf` et archives de design |

**Fin :** carte consultable, responsabilités d'accès attribuées et spécifications serveur validées.
Le brouillon de courriel et ce plan sont préparés ; les envois, accès et validations ne sont pas présumés acquis.

## 4. L01 — CI réellement bloquante

**Clôturé :** installation propre, lint, types et builds réussis ; 74 tests unitaires, 101 contrôles de
smoke isolé avec ClamAV réel, neuf sondes de rejet. Le workflow distant est configuré ; les preuves
archivées ici sont celles des exécutions locales.

Tâche : **V1-091**. Fichiers : `package.json`, manifests des workspaces, configuration de lint,
`.github/workflows/ci.yml`.

1. Inventorier les scripts et dépendances entre workspaces ; déterminer l'ordre de compilation réel.
2. Remplacer le `build:libs` qui masque des échecs par une compilation déterministe des bibliothèques.
3. Ajouter un lint TypeScript/React/Next adapté aux sources du produit. Exclure les ressources tierces,
   migrations générées et sorties de build ; ne pas masquer les erreurs du code applicatif.
4. Faire vérifier API, RPS, worker et web, ainsi que types/tests et audit des dépendances.
5. Conserver les tests unitaires existants ; fiabiliser le démarrage de l'infrastructure de test avec des
   sondes et attentes bornées. Paramétrer les scripts qui supposent les noms fixes des conteneurs afin
   d'utiliser une pile de test isolée des données de travail.
6. Archiver les preuves et les logs utiles en cas d'échec, sans contenu sensible.

**Fin :** tous les contrôles réels passent ; des défauts temporaires injectés dans un fichier de test ou
une compilation sont effectivement rejetés, puis retirés. Aucun `|| true` ne transforme l'échec d'un
contrôle obligatoire en succès. Créer le commit du lot.

## 5. L02 — échanges ciblés et audit durable

**Clôturé :** 33 scénarios supplémentaires réussis, dont six navigateur ; panne d'audit, arrêt brutal,
migration historique et isolation des repreneurs éprouvés. L'audit est transactionnel ; les refus sont
persistés après rollback. Les 101 contrôles de smoke et 74 tests unitaires restent passants.

Tâches : **V1-094, V1-095**. Fichiers : `platform/audit.service.ts`, services métier appelants,
`modules/marketplace/marketplace.service.ts`, schéma core, migrations/RLS, écrans d'échange et BFF.

### Audit

1. Définir le contrat de persistance : événement de succès dans la même transaction que l'action, ou
   intention durable par outbox. L'appel `void insert(...).catch(log)` ne suffit pas.
2. Prévoir les refus : leur preuve doit survivre à l'annulation de l'action métier, sans créer un faux
   événement de succès. Respecter contexte de rôle, organisation et corrélation.
3. Migrer progressivement tous les appels sensibles concernés, pas uniquement l'écran de certification.
4. Tester panne du stockage d'audit, rollback métier et interruption du processus ; vérifier absence
   d'événements de succès orphelins ou perdus.

### Messagerie

1. Rattacher chaque conversation à l'intérêt/repreneur approprié ; vérifier les messages historiques
   sans destinataire avant toute migration, sans les attribuer arbitrairement.
2. Adapter les politiques RLS, les contrôleurs, les contrats et le BFF pour que le cédant réponde au bon fil.
3. Afficher les conversations avec états vide/chargement/erreur ; aucun document avant le palier requis.
4. Tester deux organisations repreneuses et un cédant : aller-retour, accès croisé refusé, référence de
   conversation forgée et pièce jointe prématurée rejetées.

**Fin :** investisseur A → cédant → investisseur A fonctionne, investisseur B ne voit rien du fil A,
et chaque action sensible possède une preuve durable. Les tâches historiques restent acquises.

## 6. L03 — email SMTP, boîte SMS et bascule opérateur

**Local validé :** 17 scénarios supplémentaires dont quatre navigateur, codes lus dans les boîtes et
retours `devCode` supprimés. V1-101 terminée ; V1-093 et V1-102 en revue après validation locale.
Les accès et recettes SMTP/SMS réels restent attendus, notamment V1-028. Aucun changement de dates.

Tâches : **V1-093, V1-101, V1-102, V1-028**.
Contrats détaillés et matrice de tests : [INTEGRATIONS_LOCALES.md](INTEGRATIONS_LOCALES.md), sections 1–4.

1. Implémenter l'adaptateur SMTP derrière `EmailPort` et sa sélection stricte dans `IdentityModule`.
2. Ajouter `sms-inbox`, service HTTP de développement avec interface et scénarios d'incident.
3. Brancher l'adaptateur local derrière `SmsPort`, avec configuration validée, timeout et erreurs stables.
4. Couvrir la consommation OTP atomique, l'échec d'envoi et les tentatives concurrentes.
5. Migrer les tests de parcours pour récupérer les codes dans les boîtes ; garder les faux en mémoire
   pour les unitaires. Tester Unicode, format E.164 et destinataire exact.
6. Documenter les paramètres réels et exécuter la suite de contrats de l'adaptateur fournisseur dès que
   les accès sont reçus. Une remise simulée ne clôt pas V1-028 côté opérateur réel.

**Fin locale :** inscription email et MFA fonctionnent à partir des boîtes consultables, avec pannes
simulables. **Fin fournisseur :** réception réelle et résultat sandbox documentés. Les parties locales
permettent de continuer L04 pendant l'attente d'accès.

## 7. L04 — CFE, notifications et environnement de livraison

Tâches : **V1-109, V1-035, V1-096, V1-097, V1-098, V1-009**.

Implémentation locale et procédures : [EXPLOITATION_L04.md](EXPLOITATION_L04.md).
Le mock, l'instruction manuelle, l'outbox d'alertes et les scripts d'exploitation sont disponibles ;
les accès CFE/fournisseurs/serveur conditionnent encore leurs sous-recettes externes.

### CFE / RCCM

1. Implémenter le résolveur strict `CFE_API_ENABLED` et la migration de l'ancien réglage ; API désactivée
   n'exige ni clé ni réseau. API active choisit `mock` ou adaptateur réel.
2. Construire `registry-mock` avec réponses trouvé/introuvable/divergent et pannes déterministes.
3. Compléter le workflow CCI : file, saisie de source, confirmation/refus/compléments, historique et
   reprise manuelle explicite en cas de panne. Préserver les données déclarées séparément du registre.
4. Tester droits, modifications d'identité, preuve obsolète, rejeu et changement de mode.
5. Conserver la décision Deal-Ready nominative. Le mock ne devient pas une preuve de registre réel.

### Alertes, supervision, sauvegardes, staging

1. Déclencher le matching à partir des opportunités, avec résultat explicable et palier limité.
2. Persister les intentions, livrer via le worker, réévaluer consentement et droits à l'envoi, dédoublonner
   et reprendre les erreurs temporaires sans boucle infinie.
3. Centraliser logs et mesures, puis provoquer une erreur contrôlée pour vérifier la réception de l'alerte.
4. Programmer les sauvegardes ; retirer les erreurs de restauration masquées ; comparer à un manifeste
   de sauvegarde, pas à la base vivante. Tester bases et objets sur des cibles jetables.
5. Construire le déploiement depuis la CI sur l'environnement dédié ; séparer secrets/réseaux/volumes,
   appliquer migrations et sondes, puis tester retour arrière et restauration.

**Fin :** trois modes CFE clairement testés, alerte livrée uniquement avec consentement, notification
d'incident reçue et déploiement/restauration reproductibles. Les accès serveur et CFE réels sont suivis
en A19/A02 ; ils ne remplacent pas les tests locaux.

## 8. L05 — événements administrés depuis DealPME

Tâches : **V1-007/068/071/104/105/106/107** ; dépendances A17/A18/A21.

1. Qualifier l'offre et les autres abonnements disponibles dans une matrice : création/modification,
   authentification, participants, branding, simultanéité, tables/scène, billets, présence, recordings,
   export, langues, limite d'agents et comportement sur erreur. Chaque capacité porte preuve ou inconnu.
2. Adapter `RemoPort` à ce qui est réellement supporté ; réutiliser les endpoints API existants de création
   et publication, puis ajouter la console organisateur et son BFF. Les listes/inscriptions existantes
   restent acquises.
3. Implémenter les réservations atomiques du compte mutualisé, avec contexte produit/événement. Définir
   gestion des collisions, marges horaires, annulation et succès fournisseur au résultat indéterminé.
4. Vérifier branding par événement, lien d'entrée individuel, erreur d'accès et synchronisation de
   présence ; webhook signé/idempotent selon le contrat réellement fourni. Aucun endpoint supposé.
5. Compléter la confirmation humaine du rendez-vous diaspora et l'accès à l'entretien.
6. Prototyper l'agent participant sur données synthétiques, comparer captation scène/table et exports
   natifs ; mesurer reprise, couverture, capacité et coût. Consigner les impossibilités rencontrées.

**Fin :** un organisateur gère un événement depuis DealPME ; deux créations concurrentes ne violent pas
le quota connu ; le prototype démontre ce qui est réellement captable. Le manque d'une API de recordings
reste un résultat du prototype, pas une fonctionnalité fictivement terminée.

## 9. L06 — interface, contrats et fidélité

Tâches : **V1-092/099/080/081/083/086/075**. Commencer les contrats au fil des lots ; cette étape clôt la
revue transversale après les intégrations.

1. Reprendre les contrôles du corpus sur leurs surfaces et compléter les contrats du registre produit.
2. Couvrir `web/components` et les contrôles non étiquetés ; distinguer zones d'affichage et interactions.
   Retirer les identifiants dynamiques non vérifiables ou les rendre explicitement énumérables.
3. Étendre la fiche opportunité aux six onglets, avec états de divulgation honnêtes et données serveur.
4. Terminer clavier, focus, erreurs annoncées, intitulés des tableaux, petits écrans et liens externes.
5. Produire les captures 1440×960 et 390×844 ; documenter les écarts intentionnels dans le journal de
   fidélité. Évaluer les apports du designer sur les références institutionnelles, pas refaire le produit.

**Fin :** aucun contrôle visible sans contrat et résultat vérifiable ; parcours lisibles et utilisables
au clavier/mobile. Le `PASS` de couverture statique ne remplace pas la preuve navigateur.

## 10. L07 — recette et démonstration V1

Tâches : **V1-100/066/088/090**.

1. Rejouer l'inscription email, la session/MFA, le dossier, la vérification CFE manuelle puis mock,
   l'instruction CCI, la publication actifs, l'intérêt, l'échange et l'alerte.
2. Rejouer le blocage de publication titres et les états de démonstration ; aucune donnée confidentielle
   ne sort de son palier dans le corps, les métadonnées ou une notification.
3. Exercer création événement, inscription, accès, quotas et refus ; distinguer démonstration locale et
   recette fournisseur réelle dans les résultats.
4. Produire `qa/e2e-results.json`, `qa/control-coverage.json`, captures desktop/mobile et
   `qa/fidelity-ledger.md`, avec version testée et statut par scénario. Un scénario dépendant d'un accès
   manquant est signalé non exécuté, jamais compté comme réussi.
5. Répétition sur environnement reproductible et validation métier. Corriger les anomalies bloquantes,
   conserver le scénario et la procédure de reprise.

**Fin :** le parcours complet est démontrable et les validations sont archivées avant l'échéance V1.

## 11. L08 — une tranche V2 complète avant l'extension VDR

Tâches : **V2-001 à V2-046, sauf V2-043** (recette finale en L09).

### Ordre interne

1. Relire VDR/corpus et contrats d'accès ; préparer les tests négatifs avant les surfaces. Documenter
   la qualification d'identité et du repreneur, et traiter la suspension de publication selon l'arbitrage.
2. Durcir RPS : admission et plafond dans une transaction protégée, groupe de personnes validé,
   journal séquencé et append-only, révocation par nouvel événement, identité interservices et opérateur
   authentifiés. Tests concurrents et limites 80/100 %, pas seulement règles pures.
3. Brancher l'API vers RPS pour publications et communications ; indisponibilité = refus de divulgation.
4. Disposer d'un NDA juridiquement revu en V2, puis intégrer PSC, repli papier et preuve PSAE. Le moteur
   général LegalTech V3 n'est pas un prérequis du modèle NDA V2.
5. Implémenter les sept états d'accès du corpus et un grant expirant ; servir **un document** via rendu
   serveur page par page, filigrane, contrôle de session et téléchargement désactivé.
6. Révoquer l'accès et constater l'invalidation de la consultation et des tokens dans le délai requis.
7. Étendre aux huit états d'ingestion déjà définis, arborescence OHADA, versionnage, OCR/uploads et logs.
8. Ajouter Q&R par document avec auteur, coordinateur, visibilité et audit ; vérifier l'isolation des repreneurs.
9. Construire les données financières canoniques et leur provenance ; compléter les contrats UI,
   scénarios de référence, performances et périmètre du pentest.

**Fin :** qualification → admission → NDA → T2 → document → révocation → Q&R éprouvés, puis extension.
Les tests IA de DealLens restent en V5 ; leurs contrats peuvent être préparés dès maintenant.

## 12. L09 — mini-réunions, captation, rapports et recette V2

Tâches : **V2-047/048/049/050 puis V2-043**. L'adaptateur de captation peut avancer indépendamment du
contenu de la VDR ; l'ouverture d'une réunion privée de deal dépend de la chaîne d'accès L08.

1. Mini-réunions : invitations nominatives depuis le dossier, consentement à la présence commune,
   éventuelle révélation mutuelle d'identité contrôlée, vérification des droits à l'entrée et révocation.
2. Captation : admission de l'agent, session autorisée, états de connexion, reprise bornée, stockage privé
   et versions. Inclure l'agent dans le quota de participants. Tester la couverture de chaque session.
3. Pipeline : audio/transcript → scan → segments horodatés → transcription → résumé sourcé. Import de
   transcript contrôlé pour tester indépendamment du live ; pas de conclusion sur une portion manquante.
4. Traitement audio/résumé : moteur et conditions qualifiés via A21 avant usage réel. Le jalon J16 de
   DealLens reste inchangé ; il ne doit pas être supposé couvrir automatiquement un traitement V2.
5. Rapport : brouillon, contrôle humain, publication, notification avec lien ; intersection participation
   et permissions à la lecture. Pas de diffusion à tout le salon d'une conversation privée.
6. Tests : instructions hostiles dans le texte, fuite inter-session/produit, révocation, accès à une
   citation, panne audio/IA, traitement partiel, redémarrage et double diffusion.
7. Recette V2 intégrée, y compris le cœur L08, puis corrections et preuves.

**Fin :** rapport vérifiable du contenu réellement capté, remis aux bonnes personnes et inaccessible
après révocation. Une fonction live bloquée ne devient pas « complétée » grâce à l'import manuel.

## 13. L10 — V3 : transaction, prestataires, TaxeFacile et exploitation

Tâches : **V3-001 à V3-050**.

1. En parallèle des derniers accès, préciser le contrat TaxeFacile (A20). Réutiliser identité et
   organisation pour un référentiel prestataire commun : inscription, screening, compléments,
   acceptation/refus, publication et suspension. Préparer ses liens avec les missions Experts V4.
2. Exposer les services, dont TaxeFacile : fiche, prestataire responsable, demande, progression et retour
   de résultat. Choisir API/SSO ou renvoi contrôlé selon les capacités constatées ; pas d'attestation
   fiscale automatique simplement parce que `TaxPartnerPort.requestCertificate` existe.
3. Réaliser offres/contre-offres, LOI, audit d'acquisition, décision et résultat documenté ; conserver
   chaque version, précondition et motif. Émettre le FeeEvent requis.
4. Intégrer les modèles LegalTech versionnés et revus ; frais/rétrocession avec barème juridiquement
   activé et calcul rejouable ; facturation prépayée, grâce, facture NIF et virement institutionnel.
5. Paiement des services : agrégateur principal/secours, carte diaspora, autorisé/capturé/réglé/rapproché,
   délais par rail, webhooks et absence de double effet. Aucun séquestre de cession introduit.
6. Support, accès temporaires, break-glass, rétention/effacement, clés, disponibilité, sauvegardes,
   incident et restauration. Isoler matériellement/logiquement les services selon le plan serveur validé.
7. Tests de capacité et réseau ; pentest et traitement des constats ; fermeture documentaire G1–G10,
   recette V3 et preuves.

**Fin :** transaction et services utilisables avec statuts fiables, finances rapprochables et exploitation
éprouvée. La présence sur le même hôte ne fusionne pas les bases métier des autres produits.

## 14. L11 — V4 : services complets et rapports de salon

Tâches : **V4-001 à V4-026**.

1. Alerte & Rebond : diagnostic explicable, dossier confidentiel, actifs en difficulté et coupe-circuit.
2. Étendre Deal-Connect : billetterie/sponsoring, double accord des rendez-vous, statistiques de présence.
3. Réutiliser le pipeline de rapports de L09 pour les sessions du salon : couverture réelle, validation,
   droits et préférences de chaque participant. Statistiques P20 et contenu de session restent distincts.
4. Compléter le profil Diaspora, les contraintes transfrontalières et le renvoi vers les professionnels.
5. Réutiliser le référentiel prestataires de V3 pour les missions Experts : conflit, sélection par le
   client, contrat direct, accès limité et clôture des droits au livrable.
6. Recette V4 intégrée, sur desktop/mobile, avec refus et pannes des partenaires.

## 15. L12 — V5 : DealLens et intelligence documentaire

Tâches : **V5-001 à V5-024**.

1. Finaliser fournisseur/politique et modèle de menaces ; mettre en œuvre récupération filtrée avant
   recherche, preuve de permission et isolation Clean Team.
2. Citations document/version/page/ancre, modes document/salle et réponse d'insuffisance.
3. Construire cockpit, Issue Radar, Evidence Map, Q&R assistée, engagement descriptif, rapprochement
   financier, intelligence de version et caviardage soumis à revue humaine.
4. Vérifier révocation transitive, citations, absence d'action autonome et robustesse aux instructions
   contenues dans les documents. Réutiliser les protections de L09 sans confondre les deux périmètres.
5. Tests AI-01 à AI-06, DOC-01 à DOC-03, Q&A-01, UI-01 ; performance et recette finale transversale.

## 16. Discipline de clôture et reprise

Pour chaque tâche engagée :

1. Lire sa source et sa dépendance ; noter le contrat et le résultat attendu avant modification.
2. Marquer cette tâche en cours dans le générateur, sans déclasser un acquis.
3. Implémenter le plus petit parcours complet et les tests correspondant au risque réel.
4. Exécuter les contrôles pertinents ; en cas d'échec, conserver le diagnostic et corriger avant clôture.
5. Mettre à jour la documentation d'usage et la preuve liée au commit ; inscrire les compléments nouveaux
   séparément, dans les versions existantes.
6. Régénérer le classeur, vérifier dates/identifiants/formules et committer le lot cohérent.
7. Laisser une note de reprise : dernier contrôle réussi, accès manquant éventuel, prochaine action exacte.

**Première action applicative de reprise : L05**, qualifier les capacités Remo et construire la console
organisateur depuis les contrats vérifiés. Reprendre les sous-recettes L04 dès réception des accès
CFE/fournisseurs/serveur : A02, A16 et A19. Les dates des versions et les acquis restent inchangés.
