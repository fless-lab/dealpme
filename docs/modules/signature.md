# Module SIG : signature

- Classe : `SignatureModule` (`codebases/backend/api/src/modules/signature/`)
- Version cible : V2
- Processus contractuels : P11

## Périmètre

Signature électronique et preuve : NDA versionné, prestataire PSC accrédité ARCEP, repli papier, SignatureEvidence (hash, chaîne de certificats, horodatage), archivage PSAE.

## Sous-modules

- nda (génération, versions)
- esign (intégration PSC, webhooks vérifiés)
- fallback (parcours papier, contre-signature, vérification CCIT)
- evidence (preuve et archivage)

## Règles à ne jamais contourner

- Autorisation côté serveur uniquement ; RLS en base pour les tables liées à un deal.
- Aucun champ au-delà du palier de divulgation autorisé ne sort du serveur.
- Chaque action sensible produit un événement d'audit (identifiants, action, résultat, corrélation).
- Français langue source ; termes OHADA jamais traduits.

## Suivi

Les tâches de ce module sont dans `DealPME_Suivi.xlsx`, onglet Taches, colonne Module = SIG.
