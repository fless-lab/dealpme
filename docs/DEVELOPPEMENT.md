# Prendre la main sur DealPME

Objectif de ce document : qu'un développeur qui arrive le matin ait la plateforme complète qui tourne sur son poste
avant midi, et sache où se trouve chaque chose l'après-midi.

## Ce qu'il faut sur le poste

Node 24 ou plus (aligné sur `package.json` et la CI), npm 10 ou plus, Docker avec Compose, git avec git-lfs (les archives de conception sont en LFS).
Rien d'autre : pas de base installée localement, pas de client S3, pas de kit vendeur.

## Démarrer, la première fois

```bash
git clone https://github.com/fless-lab/dealpme.git && cd dealpme
git lfs install && git lfs checkout
npm install
cp .env.example .env
# Deux secrets à générer, le reste des valeurs par défaut convient en local :
sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -base64 32)|" .env
sed -i "s|^FIELD_ENCRYPTION_KEY=.*|FIELD_ENCRYPTION_KEY=$(openssl rand -base64 32)|" .env
bash devX/reset.sh
```

`devX/reset.sh` monte les conteneurs (trois bases PostgreSQL, Redis, MinIO, ClamAV, Mailpit), applique les
migrations, pose les politiques de sécurité au niveau des lignes, compile et charge le jeu de démonstration. Comptez
quelques minutes la première fois : l'antivirus télécharge ses signatures.

Puis, dans trois terminaux :

```bash
(cd codebases/backend/api && node --env-file=../../../.env dist/main.js)   # API sur :4000
(cd codebases/engine/rps && node --env-file=../../../.env dist/main.js)    # RPS sur :4100
npm run dev -w codebases/frontend/web                                       # web sur :3000
```

Les comptes de démonstration et leurs mots de passe sont écrits dans `.demo-credentials.local.json`, en lecture
propriétaire seulement, jamais versionné. Chaque chargement en génère de nouveaux.

## Vérifier que tout marche

```bash
bash devX/smoke_v1.sh
```

Cent un contrôles contre la pile réelle : authentification, second facteur, isolation entre cédants,
paliers de divulgation, chiffrement, antivirus, limitation de débit, signatures de webhooks, dossier cédant,
certification, place de marché, blocage réglementaire, supervision. Le script efface d'abord les compteurs
anti-force-brute : il est rejouable immédiatement.

Les autres commandes utiles :

```bash
npm run typecheck            # tout le dépôt
npm test                     # tests unitaires (règles métier, primitives de sécurité)
npm run build                # compilation complète
npm audit --audit-level=high # bloquant en intégration continue
```

## Où se trouve quoi

| Chemin | Contenu |
|---|---|
| `codebases/backend/api` | API NestJS : modules fonctionnels, plateforme transverse, schéma et migrations |
| `codebases/engine/rps` | Regulatory Perimeter Service, déployé séparément (ADR 0002) |
| `codebases/engine/rules` | Règles métier pures et testées : paliers, machine à états, listes de contrôle, évaluation |
| `codebases/frontend/web` | Application Next.js, un espace par rôle, BFF de session |
| `codebases/frontend/ui` | Design system : jetons et composants nommés |
| `codebases/external_connectors` | Un port par service externe, avec faux moteur et adaptateur réel |
| `packages/contracts` | Schémas d'entrée et enveloppe d'erreur, partagés API et web |
| `devX/` | Scripts : réinitialisation, contrôles de fumée, sauvegarde, restauration, classeur de suivi |
| `docs/` | Architecture, conventions, décisions (ADR), frontend, sécurité, ce document |

## Les règles qui ne se négocient pas

Elles viennent du cahier des charges v0 et sont éprouvées par les contrôles de fumée. Un changement qui les affaiblit
doit être discuté avant d'être écrit.

1. **L'autorisation s'évalue deux fois** : par l'API (garde de rôles) et par la base (politiques au niveau des
   lignes). Le frontend affiche des permissions, il n'en calcule aucune.
2. **Une écriture refusée par la sécurité des lignes ne lève pas d'erreur** : elle ne touche aucune ligne. Toute mise
   à jour sensible vérifie le nombre de lignes affectées et échoue explicitement sinon.
3. **Les paliers de divulgation sont une liste blanche serveur** (`disclosure-allowlist.ts`). Le prix, la
   valorisation et l'identité ne sont jamais sérialisés sous T2, quel que soit le contexte.
4. **Une ressource hors périmètre est introuvable, pas interdite** : confirmer son existence serait déjà une fuite.
   `FORBIDDEN` dit qu'un rôle ne peut pas agir, `NOT_FOUND` qu'il n'a rien à voir ici, `PERIMETER_BLOCKED` que la
   réglementation s'y oppose. Les trois restent distincts.
5. **Rien ne s'écrase** : valeurs déclarées, pièces, journaux d'audit, événements de dossier et consultations sont
   append-only, avec chaînage de version quand une correction est nécessaire.
6. **Une pièce est analysée avant d'être écrite**, jamais après. Aucune adresse publique sur le stockage.
7. **Aucune décision automatique** là où le v0 exige une personne : certification Deal-Ready, admission au cercle
   restreint, activation du barème de frais.

## Conventions de code

Français pour les commentaires, les libellés et les messages d'erreur. TypeScript strict partout,
`exactOptionalPropertyTypes` compris. Montants en entiers de FCFA, sans décimale. Identifiants UUIDv7 générés par
l'application. Horodatages en UTC avec fuseau. Détail dans `docs/CONVENTIONS.md`.

Chaque contrôle visible porte un `data-control-id` inscrit à `qa/registre-interactions.json`. Le test du registre
refuse tout identifiant inconnu : c'est ce qui empêche qu'un bouton existe sans contrat. Ajouter un contrôle,
c'est ajouter son entrée au registre dans le même commit.

## Exploitation locale

```bash
bash devX/backup.sh                          # sauvegarde des trois bases et des objets, avec empreintes
bash devX/restore-test.sh backups/<horodate> # restauration éprouvée dans une base jetable
curl -s localhost:4000/v1/health             # vie du processus, erreurs serveur sur cinq minutes
curl -s localhost:4000/v1/ready              # bases et Redis joignables
```

Mailpit est disponible sur http://localhost:8025, mais au 12/09/2026 l'identité utilise encore le faux
connecteur email : les codes sont journalisés en développement, aucun email n'est livré à Mailpit. Le
branchement SMTP est suivi en V1-093. Les objets stockés sont dans la console MinIO, http://localhost:9001.

## Suivi du projet

`DealPME_Suivi.xlsx` à la racine est le tableau de bord partagé : tâches, versions, jalons, risques, décisions,
registre de sécurité. Il est **généré**, jamais édité à la main : modifiez `devX/build_suivi.py` puis relancez
`python3 devX/build_suivi.py`. La colonne des dates de fin réelle sert au suivi ; c'est le chef de projet qui décide
de l'afficher ou non avant une présentation. Une date réelle ne doit jamais être remplacée par une date
prévue future. Les estimations d'avancement ne valent pas recette fonctionnelle.

`DealPME_Suivi.ods` est une **archive obsolète** (172 tâches, ancien calendrier jusqu'en juin 2027),
conservée avec ses dates d'origine. Le `.xlsx` et son générateur portent le suivi actif.
Dernière revue : [bilan du 12/09/2026](BILAN_AVANCEMENT_2026-09-12.md).

Dans le générateur, `AUDIT_REVIEW` porte les statuts révisés par identifiant et prime sur l'historique
`PROGRESS` ; `AUDIT_CRITERIA` porte les critères précisés. À la prochaine revue, actualiser ces entrées
avec leurs preuves et la date `AUDIT_DATE`, puis régénérer le classeur. Les dates de réalisation attestées
se saisissent dans `VERIFIED_COMPLETION_DATES`. L'historique `PROGRESS` et son seuil fixe
`LEGACY_PROGRESS_CUTOFF` ne doivent pas être avancés pour transformer d'anciennes prévisions en faits.
Les nouvelles tâches sont ajoutées en fin de liste afin de conserver les identifiants existants.
