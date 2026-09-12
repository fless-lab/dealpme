# DealPME — bilan réel et prochaines étapes

**Date : 12 septembre 2026.** Base examinée : commit `c2239ae`, puis corrections documentaires et du suivi
issues de cette revue. Aucun changement de logique applicative n'a été effectué pendant l'audit.

## 1. Verdict

**La direction d'architecture et le découpage V1 → V5 sont cohérents. V1 est une démonstration fonctionnelle
avancée, mais sa recette n'est pas terminée. V2 possède déjà des fondations ; les modules V3 à V5 restent
essentiellement à implémenter.**

Le travail existant mérite d'être conservé : monorepo structuré, séparation du RPS, schéma VDR isolé,
autorisations serveur, règles métier partagées, migrations, composants UI et scénarios synthétiques.
La principale correction de trajectoire consiste à terminer et prouver les parcours, puis à construire V2
par tranches complètes. Accumuler des écrans ou des schémas supplémentaires ne clôt pas les circuits métier.

Le plan avait trois défauts importants :

1. Des tâches « Complétée » ne satisfaisaient pas leur propre critère de fin.
2. Des fondations V2 étaient présentes alors que toute V2 apparaissait à 0 %.
3. Certaines exigences du v0 n'avaient pas de tâche : identité documentaire, abonnements prépayés,
   paiements des services et rapprochement, capacité et recettes intégrées.

## 2. Documents et sources examinés

Dans `ressources/DEALPME-20260909T190445Z-1-001/DEALPME/` :

- Cahier des charges approuvé, `01_SOURCE_BASIS/01_DealPME_v0_Approved_Build_Specification.pdf` du Master
  Developer Handoff : en particulier périmètre, RPS, identité, abonnements, paiements, exploitation et recette.
- `DealPME_Referentiel_Processus_P04-P25_Contractuel_v1.0_2026.pdf` : contrôles et articulation des processus,
  dont P08 et P13. P13 est explicitement contractuel, pages 23-24.
- `00_START_HERE/VERSION_AUTHORITY.md` : le handoff V3.1 consolidé et son arbre
  `04_EXECUTABLE_REFERENCE/DealPME_V3_Release/` font autorité sur les copies de commodité.
- `03_DEVELOPER_GUIDES/02_DEVELOPER_IMPLEMENTATION_STANDARD.md` et `04_RELEASE_GATE.md` : contrats
  d'interaction, vérité financière, permissions et preuves de livraison.

Ces sources ont été confrontées à `docs/`, aux ADR, au générateur de suivi, aux deux classeurs,
aux modules API/RPS/worker, aux connecteurs, aux écrans critiques et aux tests. Les archives et documents
stratégiques ont été inventoriés ; cette revue ne constitue pas une recette visuelle exhaustive de chaque
maquette ni une certification de toutes les exigences du corpus.

Les documents de l'ancien assistant donnent une bonne structure de travail, mais certaines affirmations
étaient devenues inexactes : A15 encore « à trancher », états VDR supposés absents, RPS présenté comme
presque prêt, emails supposés livrés à Mailpit, P13 supposé facultatif. Les points correspondants ont été
rectifiés dans les documents actifs.

## 3. Avancement recalé

| Version | Dates conservées | État observable | Avancement estimé du suivi |
|---|---|---|---:|
| V1 | 03/09/2026 → 15/10/2026 | Parcours principaux codés ; intégrations et recette à fermer | 80,2 % |
| V2 | 16/10/2026 → 25/11/2026 | Règles/RPS/schémas amorcés ; circuit de transaction non intégré | 11,2 % |
| V3 | 26/11/2026 → 30/12/2026 | Squelettes et quelques primitives ; services métier à réaliser | 0 % |
| V4 | 31/12/2026 → 05/02/2027 | Deal-Connect léger compté en V1 ; services complets à réaliser | 0 % |
| V5 | 06/02/2027 → 28/02/2027 | Corpus de conception et composants, pas de DealLens opérationnel | 0 % |

**Ces pourcentages mesurent une estimation de charge couverte, pas une proportion de produit accepté.**
Les valeurs V3–V5 à 0 % ne signifient pas absence de toute préparation : les primitives partagées et la
conception ne satisfont pas encore leurs critères de livraison.

Le classeur passe de **224 à 236 tâches**, et de **898 à 951 jours-personne estimés**. Les 53 j/p ajoutés
rendent visibles des travaux omis ; ce ne sont pas des jours réellement consommés. V1 passe de 75 à
63 tâches complétées, sans supprimer leur travail déjà réalisé. L'avancement global pondéré devient 26,4 %.

## 4. Ce qui est effectivement en place

- **Identité** : inscription, mot de passe Argon2id, vérification email simulée, second facteur des rôles
  sensibles, sessions serveur révocables et consentements.
- **Dossier cédant** : constitution, pièces privées avec adaptateur ClamAV, provenance des valeurs,
  complétude, historique et renvoi en préparation.
- **CCI-Togo / Deal-Ready** : demandes, vérifications de registre en mode manuel, décision nominative,
  remédiation, badge avec périmètre et limites.
- **Marketplace** : recherche, teaser T0, intérêts, messages, préférences d'alertes et tableaux de bord.
  La messagerie et les notifications nécessitent les corrections ci-dessous.
- **Démonstration RPS** : scénario de blocage, données synthétiques, bannière et journal de démonstration.
- **Frontend** : application Next.js, espaces par rôle, BFF, composants partagés et laboratoire.
- **Socle V2** : service RPS séparé ; tables VDR, grants, Q&R et preuves de signature. Les huit états
  d'ingestion sont déjà définis dans `database/schema/vdr.ts`.

## 5. Écarts techniques à traiter en priorité

Les constats suivants proviennent de la lecture du code. Ils ne sont pas présentés comme des incidents
reproduits sur la pile réelle pendant cette revue.

| Sujet | Preuve dans le dépôt | Action suivie |
|---|---|---|
| Messagerie bidirectionnelle incomplète | `marketplace.service.ts` écrit la réponse cédant sans intérêt destinataire ; la politique `deal_message_party` dans `drizzle/core/rls.sql` autorise le cédant ou l'organisation émettrice, pas le repreneur destinataire | V1-054 : fil ciblé, aller-retour et isolation de deux repreneurs |
| Alertes sans envoi réel | Les workers matching/notifications dans `backend/worker/src/main.ts` ne font que des logs | V1-055 : déclenchement, matching, livraison et révocation du consentement |
| Audit non garanti durable | `platform/audit.service.ts` lance l'insert sans l'attendre et ne fait que logger un échec | V1-045 / V1-094 : transaction ou outbox, preuve persistée et test de panne |
| CI faussement rassurante | `npm run lint` ne lance aucun script de workspace ; `build:libs` finit par `|| true` ; la CI ne garantit pas le build complet web/worker | V1-091 |
| Fournisseurs simulés | `identity.module.ts` utilise les faux SMS/email ; le chemin email retourne un faux même pour une sélection non-fake ; `remo-bridge.service.ts` instancie `createFakeRemo` | V1-028/068/093 et A16 |
| Recette UI non démontrée | Test du registre statique, 365 contrats `a_documenter`, pas d'E2E navigateur ; absence des six onglets dans la fiche opportunité | V1-057/084/085/086/092 |
| Exploitation partielle | Sondes/logs présents, pas de staging automatisé identifié ; sauvegarde non programmée ; `restore-test.sh` masque les erreurs de restauration et compare à la base vivante | V1-009/016/017 |
| RPS pas encore intégrable en l'état | Plafond lu avant transaction ; séquence du journal sans sérialisation ; révocation par UPDATE ; migrations sans protection append-only ; `decidedBy` fourni dans le corps | V2-044 avant V2-045 |
| API non branchée au RPS | `deal.service.ts` garde `rpsPublicationAuthorized: false` | V2-045 : appels réels et refus de divulgation en cas de panne |
| VDR encore structurelle | `DataroomModule` vide, worker d'ingestion limité aux logs | V2 : viewer, permissions, révocation et Q&R à construire |

Le `PASS` de `qa/control-coverage.json` signifie **identifiants relevés présents dans le registre**. Il ne
signifie pas `DEAD_CONTROL` vérifié, conformité visuelle ou recette globale acquise. Le scan actuel ignore
notamment `web/components` et tolère encore des identifiants dynamiques.

## 6. Les vraies prochaines étapes

### A. Prochain lot V1 : rendre le parcours démontrable et vérifiable

1. **Fiabiliser la CI** (V1-091) : linter effectif, tous les builds obligatoires, aucun succès forcé.
2. **Fermer la messagerie et l'audit** (V1-054/094) : deux repreneurs, réponse cédant reçue au bon endroit,
   isolation et persistance de la preuve même lors d'une panne.
3. **Brancher email et alertes** (V1-093/055), puis terminer SMS et Remo selon le cadrage fournisseur.
   Vérifier réellement réception, erreurs, consentement et rejeu.
4. **Recetter les parcours en navigateur** (V1-084/085/086/092) : inscription → dossier → instruction CCI →
   publication → intérêt → échange ; puis scénario RPS. Tester aussi refus, chargement, vide, erreur,
   clavier et mobile. Produire les preuves à chaque correction, pas seulement les 13–15 octobre.
5. **Fermer la démonstration** (V1-066/088/090) : données et environnement reproductibles, répétition,
   validation écrite de M. Bruno et de la CCI-Togo sur leur périmètre.

Le périmètre des six onglets et les écarts de fidélité doivent être résolus ou explicitement approuvés,
sans inventer de données T1/T2 pour remplir les écrans T0.

### B. Décisions à obtenir maintenant, en parallèle du développement

- **A01/J01** : équipe, disponibilité réelle et responsables du reste à faire.
- **A02/J02** : validation du mode manuel CFE/RCCM ou accès API réel.
- **A03/A09/J04** : designer et validation de la palette produit/marque.
- **J14** : plan Remo, API, liens d'accès, présence et limites de marque blanche.
- **A16** : fournisseurs email/SMS et préparation du contrat de paiement.
- **PSC/PSAE** : lancer la consultation pendant V1, préparer le gabarit NDA versionné pour V2.
- **A04** : organisation des experts requis avant le module complet V4.

### C. V2 : une tranche de transaction complète avant d'étendre les surfaces

Ordre de dépendance recommandé :

**Identité documentaire → qualification → RPS durci et branché → admission → NDA → T2 → consultation
d'un document → révocation vérifiée → Q&R.**

Utiliser les schémas déjà présents. Le premier livrable VDR doit prouver un accès autorisé et un accès
révoqué, puis étendre l'arborescence et les fonctions de diligence. Le modèle NDA validé doit exister en
V2, même si le moteur LegalTech général arrive en V3.

Les tests DOC/Q&R/UI relèvent de V2. Les contrats AI-01 à AI-06 peuvent être préparés en V2 ; leur
exécution sur un véritable DealLens relève de V5.

### D. V3–V5 : fermer les omissions et garder une recette par version

- V3-044/045 : abonnement prépayé, grâce sans suppression des données, facture NIF, paiements des
  services, carte diaspora et rapprochement par rail. **Cela ne concerne pas un séquestre des cessions.**
- V3-046/047 : capacité, réseau, parcours transaction/facturation, exploitation et preuves G1–G10.
- V4-025 : recette intégrée Rebond, Deal-Connect, Diaspora et Experts.
- V5 : DealLens après stabilisation VDR ; contrat IA au **15/01/2027**, aligné sur J16. L'ancienne
  échéance A08 d'avril 2027 était postérieure à la livraison prévue et a été corrigée.

## 7. Faisabilité du calendrier

**Dates inchangées ne signifie pas capacité démontrée.** Une seule personne est renseignée dans `Equipe`.
Sur les charges actuelles, l'ordre de grandeur théorique du reste à faire est :

| Version | Reste estimé (j/p) | Jours ouvrés disponibles* | Équivalents temps plein théoriques |
|---|---:|---:|---:|
| V1 | 56,3 | 24 du 14/09 au 15/10 | 2,35 |
| V2 | 181,2 | 29 | 6,25 |
| V3 | 203 | 25 | 8,12 |
| V4 | 106 | 27 | 3,93 |
| V5 | 153 | 15 | 10,20 |

\* Lundi–vendredi, sans jours fériés, congés, coordination ni délais fournisseurs. Ces ratios supposent
une parallélisation parfaite et des estimations fiables : ce ne sont pas des engagements de staffing.
L'usage d'IA ne permet pas de convertir automatiquement ces charges historiques en jours calendaires.

Le prochain arbitrage est donc **valider les charges restantes, affecter les personnes et distinguer les
dépendances techniques des attentes externes**. Le Gantt historique répartit les dates par charge ; il
ne calcule pas un chemin critique ni un plan nivelé sur les ressources. Les dates ont été conservées et
les ajouts positionnés dans leurs fenêtres, mais l'équipe doit encore valider leur faisabilité.

La feuille de route V2 omettait auparavant le lot « Mise en relation » dans son tableau de synthèse :
ses sous-totaux pouvaient différer du total de la version. Le lot a été réintégré.

## 8. Vérifications effectuées et limites

| Commande / contrôle | Résultat le 12/09/2026 |
|---|---|
| `npm run typecheck` | Réussi sur les workspaces |
| `npm test` | 74 tests réussis dans 6 fichiers ; plusieurs packages n'ont aucun test |
| `npm run build -w codebases/engine/rps -w codebases/backend/api -w codebases/backend/worker -w codebases/frontend/web` | Quatre builds réussis, dont le build de production Next.js |
| `npm run lint` | Code de sortie 0, mais aucun lint réellement exécuté |
| `npm audit --audit-level=high` | Aucun niveau élevé/critique ; 4 modérés dans la chaîne de développement esbuild/drizzle-kit |
| `docker compose -f infra/docker-compose.yml ps` | Aucun service actif ; smoke API, ClamAV réel et restauration non rejoués |

Les tests du smoke existant sont des tests HTTP/base, pas des tests de l'interface dans un navigateur.
La réussite du build ne prouve pas la disponibilité des APIs à l'exécution. Aucune recette visuelle,
validation fournisseur, approbation métier ou revue de sécurité indépendante n'est déduite de ces commandes.

## 9. Mise à jour du suivi

- Source persistante modifiée : `devX/build_suivi.py` ; classeur actif régénéré : `DealPME_Suivi.xlsx`.
- 12 tâches ajoutées **sans renuméroter les 224 tâches existantes**.
- Fenêtres de début/fin des cinq versions **et dates prévues des tâches historiques conservées**.
- Statuts corrigés avec preuves et reste à faire en commentaire ; fondations V2 reconnues sans les
  déclarer livrées.
- L'ancien classeur contenait **59 fins réelles futures**, en partie créées par une règle qui recalait la
  réalisation sur les dates prévues. Cette règle a été retirée ; les dates futures explicitement saisies
  sont écartées avec leur ancienne valeur en commentaire, sans inventer de date effective.
- Décisions A04/A08/A15 et risques actualisés ; A16 et la trace d'audit D05 ajoutés.
- `DealPME_Suivi.ods` reste inchangé : c'est une archive de 172 tâches avec un ancien calendrier allant
  jusqu'en juin 2027. **Ne pas l'utiliser comme tableau de bord courant.**

Vérification du classeur : comparaison à une copie des valeurs initiales, contrôle des 236 identifiants
uniques, conservation des cinq fenêtres et des 224 calendriers de tâches historiques, absence de fin
réelle future. Une copie a été recalculée avec LibreOffice : aucune cellule en erreur, avancements
concordants et sous-totaux complets pour les cinq versions.

Le passage d'une tâche à « Complétée » doit s'appuyer sur son critère et une preuve identifiable.
Le suivi distingue ainsi le travail construit, le travail restant et la recette encore attendue.
