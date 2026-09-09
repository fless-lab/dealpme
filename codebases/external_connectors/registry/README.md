# @dealpme/connector-registry

Registre des entreprises (CFE / RCCM) : mode API si disponible, sinon saisie manuelle supervisée (DP-CCI-011).

- `src/port.ts` : le contrat consommé par l'API et le worker.
- `src/fake.ts` : implémentation factice pour les tests et le développement.
- `src/adapters/` : un fichier par vendeur (cfe-api, manual-entry).

Règle : l'API n'importe jamais un adaptateur directement ; elle reçoit le port par injection selon la variable d'environnement du connecteur.
