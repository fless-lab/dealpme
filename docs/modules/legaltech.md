# Module LEG : legaltech

- Classe : `LegaltechModule` (`codebases/backend/api/src/modules/legaltech/`)
- Version cible : V3
- Processus contractuels : P19

## Périmètre

LegalTech OHADA et conformité fiscale : modèles versionnés avec référence du conseil, génération PDF avec mention 'aide à la rédaction', contrat de travail sous Code du travail togolais, alertes sur clauses d'agrément et de préemption, module fiscal partenaire derrière drapeau.

## Sous-modules

- templates (modèles versionnés)
- generation (PDF, variables, mentions)
- tax (module partenaire, jamais de fausse attestation)

## Règles à ne jamais contourner

- Autorisation côté serveur uniquement ; RLS en base pour les tables liées à un deal.
- Aucun champ au-delà du palier de divulgation autorisé ne sort du serveur.
- Chaque action sensible produit un événement d'audit (identifiants, action, résultat, corrélation).
- Français langue source ; termes OHADA jamais traduits.

## Suivi

Les tâches de ce module sont dans `DealPME_Suivi.xlsx`, onglet Taches, colonne Module = LEG.
