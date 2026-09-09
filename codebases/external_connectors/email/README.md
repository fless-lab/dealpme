# @dealpme/connector-email

Email transactionnel. En local : Mailpit. Les messages non transactionnels exigent consentement et lien de désinscription.

- `src/port.ts` : le contrat consommé par l'API et le worker.
- `src/fake.ts` : implémentation factice pour les tests et le développement.
- `src/adapters/` : un fichier par vendeur (smtp).

Règle : l'API n'importe jamais un adaptateur directement ; elle reçoit le port par injection selon la variable d'environnement du connecteur.
