# @dealpme/connector-storage

Stockage objet compatible S3 (MinIO en local). Chiffrement côté serveur, versionnage, aucun accès public, URL pré-signées courtes liées à la session.

- `src/port.ts` : le contrat consommé par l'API et le worker.
- `src/fake.ts` : implémentation factice pour les tests et le développement.
- `src/adapters/` : un fichier par vendeur (s3).

Règle : l'API n'importe jamais un adaptateur directement ; elle reçoit le port par injection selon la variable d'environnement du connecteur.
