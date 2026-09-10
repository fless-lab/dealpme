# ADR 0007 : dépôt des pièces du dossier cédant

Statut : accepté, 15/09/2026. Portée : V1 (dossier cédant, P04), réutilisé en V2 par la data room (P12).

## Contexte

Le dossier cédant reçoit des pièces justificatives : statuts, extrait RCCM, états financiers, attestation fiscale,
inventaire ou registre des titres. Ces fichiers sont classés CONFIDENTIAL_DEAL. Ils viennent de postes que nous ne
maîtrisons pas et seront relus par des officiers de la CCI-Togo, puis, en V2, par des repreneurs sous accord de
confidentialité. Trois risques dominent : la diffusion accidentelle par une adresse devinable, la lecture par un
tiers non autorisé, et l'introduction d'un fichier malveillant dans la chaîne.

## Décision

**Ordre imposé au dépôt : type, taille, antivirus, puis stockage.** Le verdict précède l'écriture. Un fichier
reconnu par le moteur n'est jamais écrit, ni en base ni sur le stockage objet ; le refus est journalisé avec la
signature du moteur, et le déposant reçoit un message qui dit que rien n'a été enregistré.

**Liste fermée de types acceptés** : PDF, JPEG, PNG, classeur Excel, document Word. Les bureautiques sont admis
parce que les états financiers circulent sous cette forme au Togo ; ils passent par l'antivirus comme les autres et
ne sont jamais exécutés. Un type absent de la liste est refusé en le nommant, jamais accepté puis ignoré.

**Aucune adresse publique.** Le stockage objet est privé au niveau du compte (`mc anonymous set none`), et le
contenu d'une pièce se lit par l'API, qui vérifie le périmètre du lecteur et trace la lecture. Le port de stockage
expose bien une méthode d'URL pré-signée, plafonnée à 60 secondes et liée à la session, mais l'application ne s'en
sert pas en V1 : elle est là pour la data room, où le volume l'imposera.

**Chiffrement au repos côté serveur**, imposé à l'écriture par un en-tête. En local, MinIO tient lieu de KMS avec une
clé de développement ; en production, un KMS géré fournit la clé. Un stockage qui refuse de chiffrer fait échouer le
dépôt : il n'y a pas de repli en clair.

**Signature AWS Signature V4 calculée dans le connecteur**, avec `node:crypto`. Aucun kit vendeur n'entre dans
l'arbre de dépendances de l'API : la surface d'attaque et le périmètre de `npm audit` restent petits.

**Versionnage plutôt que remplacement.** Déposer une nouvelle pièce dans la même rubrique crée une version et chaîne
la précédente, qui reste consultable. Un déclencheur en base refuse toute réécriture d'une ligne existante, y compris
par le rôle applicatif : seule la colonne de chaînage peut évoluer. La même règle vaut pour les valeurs déclarées.

## Conséquences

- Le moteur antivirus est un point de passage obligé : son indisponibilité bloque les dépôts. C'est voulu. En
  production, `CONNECTOR_ANTIVIRUS_MODE=clamav` est obligatoire et le démarrage échoue sans lui ; le faux moteur, qui
  reconnaît la chaîne de test EICAR, ne sert qu'au développement et aux tests.
- Le contenu transitant par l'API, les pièces volumineuses consomment de la mémoire applicative. La limite est fixée
  à 20 Mo par fichier (`DOSSIER_MAX_FILE_BYTES`), appliquée deux fois : par multer à la réception et par le service.
  En V2, la data room passera aux URL pré-signées pour les gros documents, avec révocation en moins de 60 secondes.
- L'espace de stockage croît sans purge automatique, puisque rien n'est supprimé. L'effacement relève de la procédure
  du DPO, comme pour le reste des données personnelles.

## Options écartées

- **Stocker les pièces en base**, en colonnes binaires : simple, mais la base devient énorme, les sauvegardes
  s'allongent et le chiffrement au repos dépend alors du seul chiffrement disque.
- **Servir les pièces par URL pré-signée dès la V1** : moins de charge applicative, mais une URL qui circule reste
  valable jusqu'à son expiration, hors de tout contrôle de périmètre, et la lecture n'est plus traçable.
- **Analyser après stockage, en tâche de fond** : plus rapide à l'écran, mais le fichier existe alors sur le stockage
  avant son verdict, et un défaut d'orchestration suffit à le rendre lisible.
