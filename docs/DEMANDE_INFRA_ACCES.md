# Serveur dédié et accès — proposition et courriel à transmettre

Préparation du 12/09/2026. Tâches V1-108 puis V1-009 ; décisions D08, A17–A21. **Proposition technique**, à
valider avec le directeur et les fournisseurs. Aucun serveur commandé ni courriel envoyé par cet audit.

## 1. Environnement à héberger

- Web Next.js, API NestJS et worker BullMQ.
- PostgreSQL core, VDR et RPS séparés, Redis, stockage objet privé, ClamAV.
- Reverse proxy TLS, supervision, sauvegardes externes et mécanisme de déploiement/retour arrière.
- Services associés, notamment TaxeFacile : ressources propres à inventorier ; leurs données applicatives
  ne doivent pas être fusionnées avec celles de DealPME pour partager un VPS.

Les sessions vidéo sont hébergées par le prestataire événementiel. Le serveur DealPME orchestre les
événements et les accès ; il n'est pas dimensionné comme un serveur WebRTC/SFU.

## 2. Proposition de capacité

| Usage | Proposition initiale | Remarques |
|---|---|---|
| Démonstration/staging privé | 4 vCPU, 16 Go RAM, 200 Go SSD/NVMe, Linux LTS et Docker Compose | Builds effectués en CI ; concurrence des jobs limitée ; données synthétiques |
| Candidat pilote avec services associés | 8 vCPU, 32 Go RAM, 400 Go SSD/NVMe extensibles | À confirmer après mesure DealPME et inventaire TaxeFacile ; pas une garantie de capacité/SLA |
| Sauvegarde indépendante | Stockage objet externe, chiffré et versionné ; capacité selon volumes et rétention | Une sauvegarde sur le disque du VPS ne couvre pas sa perte |
| Captation/transcription locale | Worker distinct ou pool dédié, concurrence bornée | ASR et agents navigateur à mesurer en V1-107 ; GPU éventuel uniquement après choix moteur et benchmark |

Budget mémoire de cadrage, à mesurer : trois Postgres (environ 3–6 Go ensemble), ClamAV (2–3 Go), processus
Node (2–4 Go), Redis/stockage/système (2–3 Go), puis marge. Les limites de conteneurs et les jobs doivent
être ajustés sur les mesures, pas seulement sur le nombre de fichiers du dépôt.

Capacité de stockage à calculer à partir des **pièces réelles et enregistrements** :

- Audio 64 kbit/s : environ 29 Mo/heure/session, soit environ 173 Mo pour six heures.
- Vidéo 1 Mbit/s : environ 450 Mo/heure/session, soit 2,7 Go pour six heures.
- Multiplier par sessions simultanées, fréquence d'événements, durée de rétention, versions et copies de
  sauvegarde. Ces débits sont des hypothèses de calcul, pas les débits garantis du fournisseur.
- Les documents du pilote et leurs pages rendues/OCR peuvent dominer le volume ; inventorier les formats
  et tailles avant de retenir définitivement le disque. Conserver une alerte et une marge de capacité.

## 3. Isolation et exploitation à prévoir

- Environnements staging/production distincts, secrets distincts, réseaux Docker et rôles DB distincts.
- Si le matériel est partagé entre DealPME et TaxeFacile : projets Compose, noms de domaine, comptes de
  service, volumes, sauvegardes et budgets CPU/RAM séparés. Définir le responsable de chaque restauration.
- Seuls les points d'entrée applicatifs sont publiés ; bases, Redis, S3 interne et ClamAV restent privés.
  Ne pas déployer le Compose local tel quel : il publie actuellement ces ports pour le développement.
- Mailpit, sms-inbox et registry-mock servent au local/CI. Le staging de démonstration utilise un profil
  dédié et des accès restreints ; ces boîtes ne sont pas exposées comme des services publics.
- Installer des limites et sondes, centraliser les journaux, tester l'alerte et le retour à une version
  précédente. Valider les migrations et la restauration avant de déclarer le déploiement terminé.
- La restauration complète inclut les trois bases, les objets et la disponibilité des clés. Le script
  actuel restaure seulement core ; V1-098 et le durcissement OPS V3 couvrent les étapes complémentaires.
- RPO/RTO et SLA du corpus se démontrent par essais ; le dimensionnement ci-dessus n'en constitue pas la preuve.

## 4. Accès et réponses attendus

| Responsable | Éléments | Déblocage |
|---|---|---|
| Directeur / hébergeur | Type d'offre, CPU/RAM/disque, renouvellement, accès administrateur ou SSH nominatif, domaine/DNS, sauvegarde et budget | V1-108/009 |
| Directeur / prestataire événementiel | Nom et URL exacts de chaque abonnement, accès organisateur, périmètres API, documentation, sandbox, clés, quotas simultanés, branding, enregistrements/export, conditions multi-produits | V1-067/104, A17/A18 |
| Responsable CFE/RCCM | Existence API, format de numéros, auth, sandbox, disponibilité, limites, réponses et références probantes | Fin de V1-035 ; mock/manuel V1-109 ne sont pas bloqués |
| Fournisseurs email/SMS | SMTP ou API, expéditeurs/sender ID, destination Togo, environnement de test, quotas, accusés, erreurs et idempotence | V1-028/093/102 ; boîtes locales indépendantes |
| Directeur / responsable TaxeFacile | Parcours utilisateur, interlocuteur technique, API/SSO ou renvoi, états de prestation, responsabilités, accès sandbox et ressources d'hébergement | A20, V3-048/049/050 |
| Responsable captation/IA | Admission agent, enregistrement des tables/scène, export/transcript, moteur autorisé, rétention et conditions de traitement | V1-107 et A21 avant V2-048/049 |
| Direction / juridique | Prestataire PSC/PSAE, NDA versionné et conditions d'archivage | V2 signature, prérequis inchangés |

Transmettre les secrets via le canal sécurisé convenu, pas dans les documents versionnés. Les noms de
paramètres et le statut des accès suffisent au classeur.

## 5. Courriel prêt à adapter

**Objet : DealPME — validation du serveur dédié et accès nécessaires aux intégrations**

Bonjour Monsieur Bruno,

À la suite de notre réunion, je vous propose de confirmer les éléments suivants pour avancer sur
DealPME et les services associés, dont TaxeFacile, en conservant le calendrier convenu.

**Serveur :** pour la démonstration/staging, proposition initiale de 4 vCPU, 16 Go de RAM et 200 Go de SSD
extensible. Pour le pilote avec les services associés, je propose d'évaluer une offre 8 vCPU, 32 Go de
RAM et 400 Go, avec sauvegarde sur un stockage distinct. Le besoin exact sera confirmé après mesure et
inventaire de TaxeFacile. Les traitements audio/agents seront isolés si leur charge le nécessite.
Merci de me confirmer l'offre existante, son renouvellement, les accès et la gestion du domaine/DNS.

**Événements :** j'ai besoin d'un accès organisateur/développeur et de la documentation API, plutôt que
d'une invitation participant. Merci de transmettre les abonnements disponibles et leurs noms/liens
exacts. Les premiers essais porteront sur la création depuis DealPME, l'entrée des participants, le
branding par événement, la simultanéité des événements et les enregistrements de scène et de tables.

**TaxeFacile :** merci de préciser l'interlocuteur technique, le parcours souhaité entre les deux
services, les interfaces disponibles et les ressources à prévoir sur l'hébergement commun.

**Autres intégrations :** merci de partager les contacts/documentations CFE-RCCM, email/SMS et signature
électronique/archivage. Nous avançons en parallèle avec Mailpit, une boîte SMS locale et un mock CFE.
Lorsque l'API CFE est désactivée, la validation reste manuelle dans la console CCI.

Enfin, je documenterai les possibilités de captation par agent participant et de comptes rendus ciblés
par session, avec leurs limites constatées lors des essais.

Cordialement,
Abdou-Raouf
