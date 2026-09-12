# Module LEG : legaltech

- Classe : `LegaltechModule` (`codebases/backend/api/src/modules/legaltech/`)
- Version cible : V3
- Processus contractuels : P19

## Périmètre

LegalTech OHADA et conformité fiscale : modèles versionnés avec référence du conseil, génération PDF avec mention 'aide à la rédaction', contrat de travail sous Code du travail togolais, alertes sur clauses d'agrément et de préemption, module fiscal partenaire derrière drapeau.

TaxeFacile est confirmé comme **service sélectionnable** par la direction lors de la réunion prise en
compte le 12/09/2026. Le catalogue V3-048 réutilise le référentiel prestataires V3-049 : inscription,
screening, validation puis publication. V3-050 couvre la demande et le suivi de prestation ; A20 précise
API/SSO ou renvoi contrôlé, responsabilités et échanges de données.

Cette confirmation ne prouve pas une API d'attestation fiscale. Le port existant `TaxPartnerPort` doit
être confronté au service réellement disponible. L'hébergement commun ne fusionne pas les bases métier.
Voir [le plan, lot L10](../PLAN_EXECUTION.md) et [le compte rendu](../COMPTE_RENDU_DIRECTION_2026-09-12.md).

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
