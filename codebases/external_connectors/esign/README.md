# @dealpme/connector-esign

Signature électronique qualifiée : prestataire togolais accrédité ARCEP (PSC). Parcours de repli papier géré côté API, pas ici.

- `src/port.ts` : le contrat consommé par l'API et le worker.
- `src/fake.ts` : implémentation factice pour les tests et le développement.
- `src/adapters/` : un fichier par vendeur (psc-accredited).

Règle : l'API n'importe jamais un adaptateur directement ; elle reçoit le port par injection selon la variable d'environnement du connecteur.
