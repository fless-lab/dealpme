# ADR 0003 : base et identifiants séparés pour la data room

Date : 09/09/2026. Statut : accepté.

## Contexte

DP-OPS-042 : une compromission en lecture du service marketplace ne doit pas donner accès aux documents de la data
room. Les rétentions diffèrent aussi (corps des documents purgé 90 jours après clôture, métadonnées 10 ans).

## Décision

Base `dealpme_vdr` distincte, identifiants distincts, aucune clé étrangère croisée avec la base core : les identifiants
de deal et de personne sont recopiés. Les fichiers sont dans un stockage objet sans accès public, servis par URL
pré-signées courtes liées à la session, après rendu serveur avec filigrane.

## Conséquences

- Deux connexions Drizzle dans l'API (`CORE_DB`, `VDR_DB`), deux jeux de migrations.
- Les jointures entre marketplace et data room se font dans l'application, jamais en SQL.
- La révocation d'un accès invalide les URL en moins de 60 secondes (rotation de la clé de session).
