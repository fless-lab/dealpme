# @dealpme/connector-tax-partner

Module fiscal partenaire (simulation, télédéclaration simplifiée, attestation). Une panne partenaire ne doit jamais produire une fausse attestation. Partenaire à confirmer.

- `src/port.ts` : le contrat consommé par l'API et le worker.
- `src/fake.ts` : implémentation factice pour les tests et le développement.
- `src/adapters/` : un fichier par vendeur (partner-http).

Règle : l'API n'importe jamais un adaptateur directement ; elle reçoit le port par injection selon la variable d'environnement du connecteur.
