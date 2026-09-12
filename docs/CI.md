# CI et recette technique locale

Lot **L01 / V1-091**, vérifié le 12/09/2026. Preuve locale archivée : [`qa/l01-ci.json`](../qa/l01-ci.json).
Le workflow GitHub exécute les mêmes commandes ; aucun résultat distant n'est déduit des essais locaux.

## Commandes

```bash
npm ci
npm run lint
npm run build:libs
npm run typecheck
npm test
npm audit --audit-level=high
npm run build:apps
npm run ci:verify-gates
npm run ci:smoke
```

`npm run build` équivaut à `build:libs && build:apps`. Les bibliothèques sont compilées dans l'ordre :
domain → contracts → i18n → testing → rules → tous les connecteurs → UI. Puis RPS, API, worker et web.
Le workspace config ne contient que les configurations partagées et ne nécessite pas de compilation.
Les 21 workspaces possédant un build sont couverts une seule fois ; le diagnostic vérifie cet inventaire.
Une erreur de compilation se propage ; TypeScript n'émet pas de nouveaux artefacts en cas d'erreur.
Le contrôle web génère ses types de routes avec `next typegen` avant `tsc`, y compris sur un poste neuf.

## Lint

ESLint couvre les sources TypeScript, le frontend React/Next et les scripts Node de `devX/`. Ressources
fournies, dépendances et sorties générées sont exclues. `--max-warnings=0` rend aussi les avertissements
bloquants. Une configuration vide de workspace n'est plus interprétée comme un lint réussi.

Choix de configuration documentés :

- TypeScript porte les contrats de props ; pas de duplication via `prop-types`.
- Apostrophes/guillemets sont autorisés dans le texte JSX français ; les caractères de fermeture suspects
  restent contrôlés.
- Les ancres HTML natives sont conservées ; leur conversion en `Link` est une décision UX distincte.
- Les règles de Hooks et de dépendances d'effets sont bloquantes, sans activer les règles optionnelles du
  React Compiler sur tout le produit.
- Les sorties console applicatives nécessitent une justification locale ; le seed est une commande CLI.
- ESLint 9 est la branche déclarée compatible avec le peer dependency d'`eslint-plugin-react` 7.37.5.
  L'alignement vers une branche plus récente se fera avec la compatibilité du plugin, sans forcer ses peers.

## Preuves de rejet

`ci:verify-gates` ajoute successivement des fichiers de sonde réservés, jamais un remplacement de fichier
existant. Chaque commande doit échouer avec **le diagnostic attendu**, pas à cause d'un timeout ou d'une
dépendance absente : lint TypeScript, Hooks React, bibliothèque, connecteur, quatre applications et test.

Les sondes sont retirées en `finally`, puis lint et build doivent de nouveau réussir. Un fichier modifié
par un tiers pendant le test est conservé avec une erreur explicite. Exécuter cette commande seule,
sans build/lint/tests concurrents dans le même arbre de travail.

Résultat : `.ci-artifacts/gate-rejections.json` avec codes de sortie, inventaire et empreintes des configs.
Le workflow la lance après les contrôles positifs, pour ne pas confondre un défaut initial avec le rejet
d'une sonde.

## Smoke isolé

Prérequis : Node 24, Docker avec Compose **≥ 2.24.4**, Python 3, Bash, curl et openssl. L'API et le RPS
doivent être compilés (`npm run build`). Aucune pile locale déjà démarrée n'est requise.

`ci:smoke` :

1. Utilise `.env.example` et un environnement éphémère ; ne charge pas les valeurs de `.env`.
2. Lance un projet Docker `dealpme-ci-*`, avec ses volumes et des ports loopback attribués dynamiquement.
3. Attend Postgres, Redis, le vrai ClamAV et l'initialisation des buckets, avec délais bornés et erreurs
   explicites. L'initialisation MinIO réessaie aussi la création de l'alias tant que le serveur démarre.
4. Applique les migrations/RLS, charge les fixtures synthétiques et place les comptes dans un fichier
   privé distinct de `.demo-credentials.local.json`.
5. Lance API/RPS sur des ports libres et vérifie leur disponibilité avant le smoke.
6. Rejoue les 101 contrôles HTTP/base et antivirus. Nettoie processus et volumes de ce projet à la fin.

Le smoke historique reste disponible sur la pile de travail : `bash devX/smoke_v1.sh`. Ses paramètres
`SMOKE_CORE_CONTAINER`, `SMOKE_REDIS_CONTAINER`, `DEMO_CREDENTIALS_FILE`, `S3_ENDPOINT` et
`CONNECTOR_REMO_WEBHOOK_SECRET` permettent de cibler une autre pile. Les requêtes HTTP et les fichiers
temporaires sont bornés/isolés. Ce test modifie le jeu synthétique de la cible choisie : préférer
`ci:smoke` pour une vérification reproductible.

Le `reset.sh` de développement garde son caractère destructif explicite, mais compile avant de toucher
aux volumes. Un échec de build ou une indisponibilité des bases/antivirus n'y est plus masqué.

## Artefacts et diagnostic

Les rapports `.ci-artifacts/*.json` et la couverture statique des contrôles sont archivés par GitHub,
même lors d'un échec des étapes précédentes. Le résumé contient une liste fermée de métadonnées.
Les rapports de smoke n'incluent que noms de contrôles et résultats, sans jeton, OTP, corps de requête
ou environnement complet.

Les logs détaillés des commandes/services restent dans un répertoire temporaire privé, dont le chemin
est affiché en cas d'échec. Ils ne sont pas envoyés dans les artefacts : les faux transports peuvent y
écrire des codes. Sur succès, les fichiers privés sont supprimés. Les autres projets Docker restent intacts.

## Résultat L01 et reprise

- Installation propre, lint, types et 21 builds : réussis.
- Tests unitaires : 74 réussis ; smoke réel isolé : 101 contrôles réussis.
- Neuf sondes volontairement invalides : neuf rejets attendus, puis retour au vert.
- Audit : aucun niveau élevé/critique, quatre modérés dans la chaîne de développement drizzle-kit/esbuild.

L01 ne valide pas encore les parcours navigateur ni les futurs transports réels. La prochaine action est
**L02 : audit durable et conversations ciblées**, selon le [plan](PLAN_EXECUTION.md).
