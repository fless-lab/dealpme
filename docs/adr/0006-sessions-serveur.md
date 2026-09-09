# ADR 0006 : sessions côté serveur, sans fournisseur d'identité externe

Date : 09/09/2026. Statut : accepté.

## Contexte

Le v0 impose l'expiration à 30 minutes des sessions ayant accès à une data room, la liste des appareils, la révocation
à distance, une vérification d'identité documentaire sans biométrie, et la souveraineté des données personnelles
(loi 2019-014, IPDCP).

## Décision

Jetons de session opaques dont seul le hash est stocké (`session.token_hash`), expiration glissante, révocation
immédiate, mot de passe Argon2id, OTP SMS via le connecteur SMS. Aucun fournisseur d'identité externe en V1 ;
la biométrie reste derrière `FEATURE_BIOMETRIC_KYC`, fermée tant que l'autorisation IPDCP n'est pas archivée.

## Conséquences

- La révocation d'une session invalide aussi les URL pré-signées de la data room (liées à la session).
- Le principal (`Principal`) est résolu par un middleware ; les gardes refusent, jamais le frontend.
- Un SSO institutionnel (CCI-Togo) pourra être ajouté plus tard comme méthode de connexion supplémentaire.
