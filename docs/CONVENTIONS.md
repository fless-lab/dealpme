# Conventions d'ingénierie

Issues du cahier des charges v0 (section 9) et du standard d'implémentation du corpus V3.1.

## API

- REST / JSON, versionnée par le chemin : `/v1/...`.
- camelCase dans le JSON, snake_case en base. Énumérations en SCREAMING_SNAKE_CASE, jamais localisées.
- Pagination par curseur sur les collections de deals et de divulgations (UUIDv7 ordonnable), jamais par offset.
- Enveloppe d'erreur : `{ error: { code, message, details, correlationId } }`. `PERIMETER_BLOCKED` (403) distinct de `FORBIDDEN`.
- `Idempotency-Key` obligatoire sur tout POST créateur d'état exposé aux relances (paiement, webhook).
- Une ressource restreinte renvoie `NOT_FOUND` quand confirmer son existence serait déjà une fuite.

## Données

- Clés primaires UUIDv7 (`newId()` de `@dealpme/domain`).
- Montants en entier XOF (`xof()`), jamais de flottant, pas de sous-unité.
- Horodatages `timestamptz` UTC ; dates d'interface en JJ/MM/AAAA, API en ISO 8601.
- Chaque colonne porte sa classification en commentaire : PUBLIC, INTERNAL, PERSONAL, SENSITIVE_PERSONAL, CONFIDENTIAL_DEAL.
- Suppression physique uniquement pour les demandes d'effacement (DPO) ; les tables append-only ne se modifient jamais.
- Téléphones en E.164, indicatif par défaut +228.

## Sécurité

- Le frontend n'est jamais la frontière de sécurité. Chaque endpoint vérifie le rôle et la RLS s'applique en base.
- Aucun champ au-delà du palier autorisé ne sort du serveur : `projectForTier` est la seule autorité.
- Secrets en variables d'environnement, jamais dans le code. Le build échoue sur vulnérabilité critique.
- Toute action sensible produit un événement d'audit sans contenu confidentiel.

## Français langue source

- Chaînes d'interface, modèles juridiques et notifications rédigés en français d'abord ; l'anglais est dérivé.
- Typographie française : espace fine insécable avant `; : ! ?`, guillemets « », mois en minuscules, 1er / 2e, pas de tiret long.
- Termes OHADA jamais traduits (liste dans `@dealpme/i18n`).

## Interface

- Chaque contrôle visible porte un `data-control-id` présent dans `qa/registre-interactions.json` ; un contrôle sans
  contrat bloque la release. Le test `codebases/frontend/web/test/interaction-registry.test.ts` refuse tout
  identifiant absent du registre et produit `qa/control-coverage.json`, preuve attendue par le Release Gate.
- Les identifiants du corpus font autorité sur les surfaces qu'il couvre ; les autres sont inscrits au registre
  avec l'origine `depot`. Le registre ne référence que des éléments actionnables, jamais des zones d'affichage.
- Chaque écran possède ses états vide, chargement, bloqué, erreur.
- Aucune allégation de sécurité, de certification ou de valorisation au-delà de ce qui est construit et prouvé.
- Toute donnée de démonstration est étiquetée synthétique.

## Definition of done (par fonctionnalité)

Données complètes, contrats d'interaction, tests positifs et négatifs, permissions testées côté serveur, états d'écran,
événements d'audit, tests de divulgation, cohérence financière, rendu desktop et mobile, français natif, release gate passée.
