# @dealpme/connector-remo

Remo.co : salons virtuels, stands et rendez-vous vidéo pour Deal-Connect et Guichet Diaspora (décision du 09/09/2026). Périmètre exact à cadrer avec la documentation API.

- `src/port.ts` : le contrat consommé par l'API et le worker.
- `src/fake.ts` : implémentation factice pour les tests et le développement.
- `src/adapters/` : un fichier par vendeur (remo-api).

Règle : l'API n'importe jamais un adaptateur directement ; elle reçoit le port par injection selon la variable d'environnement du connecteur.
