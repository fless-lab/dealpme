# @dealpme/connector-sms

SMS transactionnels (OTP, notices critiques). Fournisseur distinct de l'email. Consentement et désinscription gérés côté API.

- `src/port.ts` : le contrat consommé par l'API et le worker.
- `src/fake.ts` : implémentation factice pour les tests et le développement.
- `src/adapters/` : un fichier par vendeur (generic-http).

Règle : l'API n'importe jamais un adaptateur directement ; elle reçoit le port par injection selon la variable d'environnement du connecteur.
