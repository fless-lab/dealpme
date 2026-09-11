# Alignement avec le corpus de référence

Relecture du 11/09/2026 du Master Developer Handoff V3.1 et du cahier des charges v0, comparée à ce qui est
construit. Ce document sert à décider quoi reprendre, quoi étendre, et quoi laisser tel quel.

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

### 1. Registre d'interactions : 376 identifiants hors registre

Le standard impose que chaque contrôle visible porte un `data-control-id` **présent dans le registre**. Le
Release Gate en fait une condition bloquante (`UNREGISTERED_CONTROL`, P0).

État réel : le registre officiel compte **76 identifiants** ; le code en utilise **382**, dont **6 seulement**
figurent au registre. En l'état, la recette officielle échouerait.

Nuance importante : le registre ne couvre que trois surfaces de référence, la fiche d'opportunité PT-001, la
data room et un gabarit de scénario de service. Il ne dit rien de la connexion, de l'inscription, du dossier
cédant, de la console CCI-Togo, de l'espace investisseur ni de Deal-Connect, qui représentent les quatre
cinquièmes de ce qui est construit. Le registre n'est donc pas un catalogue complet du produit : c'est le
catalogue des surfaces livrées avec le corpus.

Trois écarts de forme, eux, sont incontestables :

- **Nommage** : la convention officielle est un nom fonctionnel neutre, réutilisable d'une fixture à l'autre
  (`TAB_OVERVIEW`, `EXPRESS_INTEREST`, `PRIMARY_ACTION`). Le contexte est porté par les colonnes du registre,
  pas par l'identifiant. Le code préfixe par écran (`CCI_CERT_SUBMIT`, `OPP_DETAIL_NEXT`), ce qui interdit la
  réutilisation d'un contrat d'une surface à l'autre.
- **Contrôles contre états** : le registre ne référence que des éléments actionnables. Le code étiquette aussi
  des zones d'affichage (`_ERROR`, `_EMPTY`, `_BADGE`, `_ROW`), ce qui n'a pas de contrat d'interaction possible.
- **Identifiants dynamiques** : deux identifiants sont construits à l'exécution, donc non énumérables et non
  vérifiables par la preuve de recette `qa/control-coverage.json`.

Sur les surfaces que le registre couvre, le code aurait dû reprendre les identifiants officiels : la fiche
d'opportunité devrait porter `EXPRESS_INTEREST`, `CONTACT_SELLER`, `REQUEST_MEETING`, `TOGGLE_FAVORITE`,
`OPEN_VDR` et les six onglets, au lieu de `OPP_DETAIL_*`.

**Décision à prendre** : voir A15 au classeur.

### 2. Modèle de données financières plus pauvre que le standard

Le standard décrit une vérité financière canonique : compte de résultat sur cinq ans, bilan sur trois ans,
flux de trésorerie sur trois ans, besoin en fonds de roulement, délais clients et fournisseurs, jours de
stock, dette brute, trésorerie et dette nette, chacun avec sa provenance, son année et son unité.

Le dossier cédant en V1 ne collecte que le chiffre d'affaires, l'excédent brut d'exploitation et la dette
nette. C'est suffisant pour l'évaluation indicative, insuffisant pour le poste de travail de transaction et
pour le rapprochement financier attendu en V2 et V3.

### 3. Vocabulaire des états d'un document

Le guide VDR fixe huit états d'ingestion : `UPLOADED`, `SCANNING`, `PROCESSING`, `REVIEW_REQUIRED`,
`PUBLISHED`, `SUPERSEDED`, `REVOKED`, `QUARANTINED`. Le dossier cédant en V1 utilise un état de scan à trois
valeurs, ce qui convient à son usage mais ne préfigure pas la data room. La V2 doit adopter le vocabulaire du
guide plutôt que d'étendre celui de V1.

### 4. Preuves de recette absentes

Le Release Gate exige que la livraison produise `qa/e2e-results.json`, `qa/control-coverage.json`, des
captures desktop et mobile, et `qa/fidelity-ledger.md`. Les contrôles de fumée existent et passent, mais ils
ne produisent aucun de ces artefacts. Le corpus fournit d'ailleurs un exemple de format consolidé.

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

Autrement dit, V2 n'est pas à concevoir : elle est à transposer. C'est la raison pour laquelle la relecture
avant écriture change le résultat.

## Ordre de travail proposé pour V2

1. **Trancher la question du registre** (A15), parce qu'elle conditionne le nommage de tout ce qui sera écrit.
2. **Transposer les tests d'acceptation P0 du corpus** en contrôles de fumée, avant d'écrire les surfaces :
   ils définissent le comportement attendu mieux qu'une spécification rédigée après coup.
3. **Data room** : schéma et états d'ingestion du guide, permissions serveur, viewer, révocation, Q&R.
4. **Circuit RPS réel** : il est déjà en place et éprouvé ; restent le pack de preuves et le branchement de
   l'API sur le service, aujourd'hui court-circuité par un drapeau fonctionnel.
5. **Signature électronique** : dépend d'un contrat avec un prestataire accrédité, donc à cadrer tôt.
6. **Preuves de recette** : produire les artefacts attendus par le Release Gate.
