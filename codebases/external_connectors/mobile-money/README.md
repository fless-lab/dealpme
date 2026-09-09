# @dealpme/connector-mobile-money

Paiement mobile money via agrégateur (CinetPay, Hub2, PayDunya, PayGate Global). Rails : T-Money, Flooz, Gozem Money. Prépayé, jamais récurrent.

- `src/port.ts` : le contrat consommé par l'API et le worker.
- `src/fake.ts` : implémentation factice pour les tests et le développement.
- `src/adapters/` : un fichier par vendeur (cinetpay, hub2, paydunya).

Règle : l'API n'importe jamais un adaptateur directement ; elle reçoit le port par injection selon la variable d'environnement du connecteur.
