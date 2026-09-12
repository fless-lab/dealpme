# Alignement avec le corpus de référence

Relecture initiale du 11/09/2026, actualisée le 12/09/2026 après confrontation au code et aux tests.
Voir [le bilan d'avancement](BILAN_AVANCEMENT_2026-09-12.md) pour les preuves, le reste à faire et les limites de vérification.

Les compléments de la réunion direction et le mode CFE manuel/mock sont tracés dans le
[compte rendu](COMPTE_RENDU_DIRECTION_2026-09-12.md) et le [plan actif](PLAN_EXECUTION.md). Les besoins de
services TaxeFacile et de comptes rendus événementiels ne réactivent pas globalement le blueprint v5 écarté.

## Ce qui fait autorité, et sur quoi

| Source | Autorité sur | Statut |
|---|---|---|
| Cahier des charges v0 approuvé | périmètre, règles métier, interdits | autorité première |
| Référentiel de processus P04-P25 | enchaînement des processus contractuels | autorité première |
| Standard d'implémentation v3 | contrat d'interaction, divulgation, données financières, définition du terminé | autorité de mise en œuvre |
| Matrice des états d'accès | sept états d'accès à la data room | autorité de mise en œuvre |
| Release Gate v3 | dix conditions bloquantes | autorité de recette |
| Registre d'interactions global V3.1 | 76 contrôles, sur la fiche d'opportunité, la data room et un gabarit de service | partiel, voir plus bas |
| Guide VDR Intelligence 3.1 | data room, DealLens, preuves, incidents | autorité de mise en œuvre V2 et V5 |
| Blueprint des services v5 | non retenu par décision du 09/09/2026 | pas une source d'exigences |

## Ce qui est déjà aligné

- **Matrice des états d'accès** : `vdr-gate.ts` implémente les sept états et leurs sept résultats, à l'identique.
- **Paliers de divulgation** : `disclosure-allowlist.ts` est la seule autorité de projection, appliquée serveur.
- **Introuvable plutôt qu'interdit** pour les ressources hors périmètre.
- **Aucune décision automatique** là où le v0 exige une personne : certification, admission au cercle.
- **Français langue source**, formats FCFA sans décimale, termes OHADA non traduits.
- **Journal d'audit** sur chaque action sensible, sans contenu confidentiel.
- **Progression de transaction** : alignée le 11/09/2026 sur les dix stades du standard, dans une liste unique
  partagée par tous les écrans (`transaction-stages.ts`). Trois écrans affichaient auparavant trois variantes.

## Écarts constatés

### 1. Registre d'interactions : appartenance vérifiée, contrats encore incomplets

Le standard impose que chaque contrôle visible porte un `data-control-id` **présent dans le registre**. Le
Release Gate en fait une condition bloquante (`UNREGISTERED_CONTROL`, P0).

Le constat initial de 376 identifiants hors registre a été traité par A15 et l'ajout d'un registre local.
Au 12/09, `npm test` produit **441 entrées** (76 issues du corpus, 365 du dépôt), **371 identifiants
statiquement relevés**, **0 hors registre**, mais **365 contrats à documenter** et **1 fichier avec identifiant
dynamique**. Le `PASS` de `qa/control-coverage.json` porte uniquement sur l'appartenance au registre.

Nuance importante : le registre ne couvre que trois surfaces de référence, la fiche d'opportunité PT-001, la
data room et un gabarit de scénario de service. Il ne dit rien de la connexion, de l'inscription, du dossier
cédant, de la console CCI-Togo, de l'espace investisseur ni de Deal-Connect, qui représentent les quatre
cinquièmes de ce qui est construit. Le registre n'est donc pas un catalogue complet du produit : c'est le
catalogue des surfaces livrées avec le corpus.

Trois points restent à traiter :

- **Nommage** : reprendre les identifiants du corpus sur les surfaces correspondantes ; les extensions du
  produit suivent la décision A15, désormais tranchée.
- **Contrôles contre états** : le registre ne référence que des éléments actionnables. Le code étiquette aussi
  des zones d'affichage (`_ERROR`, `_EMPTY`, `_BADGE`, `_ROW`), ce qui n'a pas de contrat d'interaction possible.
- **Couverture** : le test tolère jusqu'à deux fichiers avec identifiant dynamique et ne parcourt que
  `web/app` et `ui/src`, pas `web/components`. Il ne prouve ni l'absence de contrôles non étiquetés ni les
  comportements dans un navigateur.

La fiche opportunité reprend déjà `EXPRESS_INTEREST`, mais reste un teaser T0 sans les six onglets du
corpus. L'acquis V1-057 est conservé ; l'extension V1-099 traite cet écart, à résoudre ou explicitement
approuver dans le journal de fidélité.

**Travail à faire** : V1-092 pour les parcours V1 ; V2-003 pour terminer et étendre. Aucun besoin de rouvrir A15.

### 2. Modèle de données financières plus pauvre que le standard

Le standard décrit une vérité financière canonique : compte de résultat sur cinq ans, bilan sur trois ans,
flux de trésorerie sur trois ans, besoin en fonds de roulement, délais clients et fournisseurs, jours de
stock, dette brute, trésorerie et dette nette, chacun avec sa provenance, son année et son unité.

Le dossier cédant en V1 ne collecte que le chiffre d'affaires, l'excédent brut d'exploitation et la dette
nette. C'est suffisant pour l'évaluation indicative, insuffisant pour le poste de travail de transaction et
pour le rapprochement financier attendu en V2 et V3.

### 3. Vocabulaire des états d'un document

Le guide VDR fixe huit états d'ingestion : `UPLOADED`, `SCANNING`, `PROCESSING`, `REVIEW_REQUIRED`,
`PUBLISHED`, `SUPERSEDED`, `REVOKED`, `QUARANTINED`. Ils sont **déjà présents** dans
`codebases/backend/api/src/database/schema/vdr.ts`. Le scan à trois états du dossier V1 a un autre usage.
Le travail V2 porte sur le pipeline et les transitions exécutables : `DataroomModule` est vide et le worker
d'ingestion ne fait encore que journaliser les jobs.

### 4. Preuves de recette partielles

Le Release Gate exige que la livraison produise `qa/e2e-results.json`, `qa/control-coverage.json`, des
captures desktop et mobile, et `qa/fidelity-ledger.md`. La couverture statique existe et a été régénérée le
12/09. Les trois autres preuves n'ont pas été trouvées. Le smoke API existe mais n'a pas été rejoué pendant
cet audit, la pile Docker étant arrêtée. La recette navigateur est suivie dans les compléments
V1-092/100 et la tâche de captures V1-086 ; les travaux de tests V1-084/085 restent acquis.

### 5. RPS : socle réel, garanties encore à construire

Les règles, routes et tables existent, mais l'API conserve `rpsPublicationAuthorized: false`. Dans le RPS,
le plafond est lu avant la transaction d'admission, le journal calcule sa prochaine séquence sans verrou,
la révocation modifie les lignes de divulgation et les migrations ne posent pas de protection append-only.
Les tâches V2-044/045 couvrent le durcissement et l'intégration ; un simple changement de drapeau ne suffit pas.

### 6. Exigences du v0 et du référentiel oubliées dans le plan

- DP-IDN-050 / P08 : vérification documentaire d'identité, distincte de l'email vérifié (V2-046).
- DP-IDN-041 à 045 : abonnement prépayé, renouvellement, grâce, facture NIF et virement (V3-044).
- DP-OPS-030 à 032 : paiements des services, secours fournisseur, carte diaspora et rapprochement par rail
  (V3-045). Cela ne réintroduit pas le séquestre des transactions, exclu du v0.
- P13 est explicitement **contractuel** dans le référentiel, pages 23-24. A04 porte désormais sur
  l'organisation des missions avant le module complet V4, pas sur l'existence de l'exigence.
- Capacité pilote et recettes intégrées V3/V4 : tâches V3-046/047 et V4-025.
- Compléments de réunion : boîte SMS et mock CFE, console organisateur, limites de compte partagé,
  mini-réunions privées, captation et rapports de contenu, catalogue/prestataires et parcours TaxeFacile.
  Voir la matrice de couverture du compte rendu ; les travaux préexistants restent acquis.

## Ce que le corpus apporte pour la suite

- **Data room** : arborescence OHADA, rendu serveur page à page, filigrane dynamique, téléchargement désactivé
  par défaut, URL courte liée à la session, révocation effective, Q&R par document, message de protection
  honnête. Les chemins d'API sont déjà spécifiés, jusqu'au nom des routes.
- **Pare-feu de divulgation** : les dix étapes de la récupération autorisée sont écrites, dans l'ordre, avec
  l'interdit central : jamais récupérer largement puis masquer.
- **Contrat de réponse DealLens** : forme exacte de la réponse, avec citations, niveau de confiance et réponse
  d'insuffisance.
- **Tests d'acceptation P0** : AI-01 à AI-06, DOC-01 à DOC-03, Q&A-01, UI-01, directement transposables en
  contrôles de fumée.
- **Registre d'incidents** : champs obligatoires d'un risque, qui évitent la note libre.
- **Q&R** : rôles du circuit, du brouillon à l'approbation.

Le corpus fournit une base de conception détaillée. La transposition demande encore des contrats de sécurité,
de persistance, d'intégration et de recette adaptés au produit réel.

## Ordre de travail proposé pour V2

1. **Stabiliser V1 et sa recette** : messagerie, notifications, audit durable, CI, contrats et preuves navigateur.
2. **Préparer PSC/PSAE et le NDA** pendant V1 ; le modèle NDA V2 ne doit pas attendre le moteur LegalTech V3.
3. **Définir les tests de la tranche V2** : identité vérifiée, qualification, admission, NDA, T2, document,
   révocation ; préparer les contrats IA dont l'exécution reste en V5.
4. **Durcir le RPS puis le brancher** : concurrence, append-only, identité de l'opérateur, panne refusée.
5. **Implémenter une tranche VDR complète**, puis étendre l'arborescence, le viewer et les Q&R.
6. **Archiver les preuves** à chaque tranche et conserver une recette finale V2.
