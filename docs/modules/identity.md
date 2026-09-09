# Module IDN : identity

- Classe : `IdentityModule` (`codebases/backend/api/src/modules/identity/`)
- Version cible : V1
- Processus contractuels : P08

## Périmètre

Identité, abonnement et facturation : inscription, Argon2id, OTP SMS, sessions serveur, consentements séparés, paliers d'abonnement prépayés.

## Sous-modules

- auth
- otp
- session
- consent
- subscription

## Règles à ne jamais contourner

- Autorisation côté serveur uniquement ; RLS en base pour les tables liées à un deal.
- Aucun champ au-delà du palier de divulgation autorisé ne sort du serveur.
- Chaque action sensible produit un événement d'audit (identifiants, action, résultat, corrélation).
- Français langue source ; termes OHADA jamais traduits.

## Suivi

Les tâches de ce module sont dans `DealPME_Suivi.xlsx`, onglet Taches, colonne Module = IDN.
