# Module EXP : experts

- Classe : `ExpertsModule` (`codebases/backend/api/src/modules/experts/`)
- Version cible : V4 (module complet)
- Processus contractuels : P13

## Périmètre

Deal-Experts : registre d'experts qualifiés, déclaration de conflit d'intérêts, routage du besoin, propositions et sélection par le client, contrat direct client-expert hors facturation DealPME, accès temporaire scopé en lecture expirant à la remise du livrable.

Le référentiel P04-P25, pages 23-24, classe P13 en **socle contractuel, article 12.3**. A04 porte sur
l'organisation des missions nécessaires avant la livraison du module complet V4 (Deal-Ready, audit),
à confirmer avec la CCI-Togo. Le statut contractuel est établi par la source ; la modalité opérationnelle
anticipée reste à valider.

## Sous-modules

- registry (experts, conflits)
- engagements (routage, sélection)
- scoped-access (lecture, expiration)

## Règles à ne jamais contourner

- Autorisation côté serveur uniquement ; RLS en base pour les tables liées à un deal.
- Aucun champ au-delà du palier de divulgation autorisé ne sort du serveur.
- Chaque action sensible produit un événement d'audit (identifiants, action, résultat, corrélation).
- Français langue source ; termes OHADA jamais traduits.

## Suivi

Les tâches de ce module sont dans `DealPME_Suivi.xlsx`, onglet Taches, colonne Module = EXP.
