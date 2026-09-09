# Module NEG / REA : negotiation

- Classe : `NegotiationModule` (`codebases/backend/api/src/modules/negotiation/`)
- Version cible : V3
- Processus contractuels : P14, P15, P16

## Périmètre

Négociation et réalisation : offres et contre-offres versionnées, LOI générée par LegalTech, registre des points ouverts d'audit d'acquisition, décision poursuivre / renégocier / abandonner, réalisation déclarée par les parties sans Deal-Pay natif, création automatique du FeeEvent.

## Sous-modules

- offers (offre, contre-offre)
- loi (lettre d'intention)
- diligence (points ouverts P15)
- closing (réalisation P16, FeeEvent)

## Règles à ne jamais contourner

- Autorisation côté serveur uniquement ; RLS en base pour les tables liées à un deal.
- Aucun champ au-delà du palier de divulgation autorisé ne sort du serveur.
- Chaque action sensible produit un événement d'audit (identifiants, action, résultat, corrélation).
- Français langue source ; termes OHADA jamais traduits.

## Suivi

Les tâches de ce module sont dans `DealPME_Suivi.xlsx`, onglet Taches, colonne Module = NEG.
