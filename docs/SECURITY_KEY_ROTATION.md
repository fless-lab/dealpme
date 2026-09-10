# Rotation de la clé de chiffrement applicatif

Champs concernés (classification CONFIDENTIAL_DEAL) : `deal.asking_price_enc`, `deal.valuation_basis_enc`,
`share_deal_detail.stake_percent_enc`, `share_deal_detail.transfer_restrictions_enc`, `indicative_valuation.equity_low_enc`,
`indicative_valuation.equity_high_enc`. Algorithme : AES-256-GCM, vecteur d'initialisation aléatoire par valeur,
étiquette d'authentification stockée avec le chiffré. Format stocké : `<identifiant de clé>:<base64(iv | tag | chiffré)>`.

## Où vit la clé

- Jamais en base, jamais dans le dépôt. Variable d'environnement `FIELD_ENCRYPTION_KEY` (32 octets en base64).
- En production : coffre à secrets (gestionnaire du fournisseur d'hébergement ou HashiCorp Vault), injecté au démarrage.
- Accès à la clé restreint au rôle exploitant ; toute lecture de la clé est journalisée par le coffre.

## Procédure de rotation (sans interruption)

1. Générer la nouvelle clé : `openssl rand -base64 32`.
2. Déployer avec `FIELD_ENCRYPTION_KEY` = nouvelle clé, `FIELD_ENCRYPTION_KEY_ID` = nouvel identifiant (par exemple `v2`),
   `FIELD_ENCRYPTION_KEY_PREVIOUS` = ancienne clé, `FIELD_ENCRYPTION_KEY_PREVIOUS_ID` = `v1`.
   Les lectures acceptent les deux identifiants ; toutes les écritures utilisent `v2`.
3. Exécuter le script de re-chiffrement (à écrire avec le module finance, V3) qui lit chaque valeur portant `v1:`,
   la déchiffre avec la clé précédente et la réécrit avec la clé courante, par lots, dans une transaction par ligne.
4. Vérifier : `select count(*) from deal where asking_price_enc like 'v1:%'` doit renvoyer 0 (idem pour les autres colonnes).
5. Retirer `FIELD_ENCRYPTION_KEY_PREVIOUS` du déploiement et détruire l'ancienne clé dans le coffre.
6. Consigner la rotation dans le journal des décisions (date, identifiants de clé, opérateur).

## Cadence

- Rotation annuelle, ou immédiate en cas de suspicion de compromission (incident P1, procédure P25).
- La clé de session (`SESSION_SECRET`) suit la même cadence ; sa rotation invalide toutes les sessions.

## Ce que le chiffrement applicatif ne couvre pas

- Les identifiants de dossier, les tranches de chiffre d'affaires et les codes secteur restent en clair : ce sont des champs PUBLIC ou INTERNAL.
- Les documents de la data room (V2) sont chiffrés par le stockage objet côté serveur, avec une clé distincte.
