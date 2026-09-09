# @dealpme/connector-archiving

Archivage électronique à valeur probante (PSAE accrédité) pour la piste d'audit de signature. Une table SQL n'est pas un service d'archivage.

- `src/port.ts` : le contrat consommé par l'API et le worker.
- `src/fake.ts` : implémentation factice pour les tests et le développement.
- `src/adapters/` : un fichier par vendeur (psae).

Règle : l'API n'importe jamais un adaptateur directement ; elle reçoit le port par injection selon la variable d'environnement du connecteur.
