# @dealpme/connector-ai-provider

Fournisseur de modèle pour DealLens (V5). Aucun document VDR ne sort vers un outil public : uniquement le fournisseur sous contrat. Le filtrage des permissions a lieu AVANT l'appel.

- `src/port.ts` : le contrat consommé par l'API et le worker.
- `src/fake.ts` : implémentation factice pour les tests et le développement.
- `src/adapters/` : un fichier par vendeur (contracted-provider).

Règle : l'API n'importe jamais un adaptateur directement ; elle reçoit le port par injection selon la variable d'environnement du connecteur.
