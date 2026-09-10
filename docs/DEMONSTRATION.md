# Guide de démonstration V1

Ce document sert à préparer et à conduire la démonstration. Il dit ce qui est montré, dans quel ordre, avec quel
compte, et ce qu'il faut répondre quand la question arrive. Durée visée : vingt minutes de démonstration, dix de
questions.

## Avant de commencer

```bash
bash devX/reset.sh          # pile propre et jeu de démonstration frais
bash devX/smoke_v1.sh       # 94 contrôles : si un seul échoue, ne pas présenter
```

Puis démarrer l'API, le service RPS et l'application web (voir `docs/DEVELOPPEMENT.md`). Ouvrir
`.demo-credentials.local.json` et garder les mots de passe sous la main : ils changent à chaque chargement.

Trois onglets préparés à l'avance, connectés chacun avec un compte différent, évitent les connexions à l'écran :

| Onglet | Compte | Rôle |
|---|---|---|
| Cédant | `cedant.froidroute@demo.dealpme.local` | prépare et publie un dossier |
| CCI-Togo | `officier@cci-togo.demo.dealpme.local` | instruit et certifie (second facteur, code affiché à l'écran en local) |
| Repreneur | `investisseur@demo.dealpme.local` | consulte et se manifeste |

Le bandeau « données de démonstration » est visible en permanence : le dire une fois au début évite dix questions.

## Déroulé

### 1. Le problème, en une phrase (1 min)

Au Togo, une transmission d'entreprise se joue dans un cercle d'interconnaissance. Le cédant ne sait pas à qui
parler sans que la nouvelle se répande ; le repreneur ne sait pas ce qui est vérifié. DealPME organise cette
rencontre sous confidentialité contrôlée, avec la CCI-Togo comme tiers de confiance.

### 2. Ce que voit un repreneur (3 min)

Onglet repreneur, page **Opportunités**. Montrer les filtres, ouvrir une fiche.

À dire : ce qui est affiché est délibérément pauvre. Secteur, région, tranche de chiffre d'affaires. Ni le nom de
l'entreprise, ni le prix, ni les conditions. La lentille de permission, sur la fiche, ne se contente pas de cacher :
elle dit pourquoi c'est fermé et ce qui l'ouvrira.

Manifester l'intérêt, écrire un message. **Tenter d'y glisser un numéro de téléphone** : le message est refusé, en
nommant ce qu'il faut retirer. Ce n'est pas de la police, c'est la protection du cédant : tant que l'accord de
confidentialité n'est pas signé, les coordonnées ne circulent pas par la plateforme.

### 3. Ce que fait un cédant (5 min)

Onglet cédant, **Mes dossiers**. Ouvrir le dossier existant, montrer l'assistant : le nombre d'éléments manquants
s'affiche sur chaque étape.

Points à faire remarquer :
- **Le type de cession est choisi à l'étape 1 et devient définitif.** C'est ce qui commande les pièces attendues et
  le régime de diffusion. La plateforme l'impose au niveau de la base de données, pas seulement à l'écran.
- **Une correction ne remplace pas la valeur précédente** : elle crée une version. Ouvrir l'historique d'un chiffre.
  C'est ce qui permet d'afficher « déclaré, non audité » sans que la formule soit creuse.
- **Une pièce est analysée avant d'être enregistrée.** Si quelqu'un demande une preuve, déposer un fichier
  quelconque puis expliquer que le moteur ClamAV se prononce avant l'écriture, et qu'un fichier refusé n'existe
  nulle part.
- **Le récapitulatif** montre ce que la CCI-Togo lira, et la soumission est refusée tant qu'un élément manque, avec
  la liste nommée des manques.

### 4. Ce que fait la CCI-Togo (5 min)

Onglet CCI-Togo, **Console**. Tableau de bord agrégé : compteurs, jamais le contenu d'un dossier.

- **Adhésions** : la confirmation enregistre une référence transmise par la chambre. Aucun fichier de membres n'est
  importé dans la plateforme.
- **Entreprises**, ouvrir une fiche : le déclaré et le vérifié côte à côte, jamais fusionnés, avec les écarts
  signalés. Faire une vérification RCCM en mode manuel : l'officier reporte ce qu'il a lu et indique sa source.
- **Demandes de certification** : la file d'instruction, avec une demande en attente de compléments. Montrer les
  compléments nommés, puis prendre la décision depuis la fiche de l'entreprise.
- **Insister** : la décision porte le nom de l'officier, elle est horodatée, et un officier qui déclare un conflit
  d'intérêts ne peut pas décider. Le badge ne s'affiche jamais sans sa portée, qui dit ce qui est vérifié et,
  surtout, ce qui ne l'est pas.

Si la question du poids institutionnel arrive : la certification est une décision de la chambre, pas un score
calculé par un algorithme. La plateforme ne certifie rien, elle instrumente une décision humaine et la trace.

### 5. Le blocage réglementaire (4 min)

C'est le moment qui distingue DealPME d'un site d'annonces. Onglet cédant, page **Démonstration RPS**.

Dérouler les quatre temps de l'écran : ce que voit un tiers, ce que verrait un repreneur admis au cercle, la
tentative de publication, la trace enregistrée.

À dire, mot pour mot si besoin : proposer des titres de société au public sans y être autorisé expose l'opération à
la nullité. La plupart des plateformes en font une consigne écrite dans les conditions d'utilisation. Ici, c'est le
serveur qui refuse, et le refus est écrit dans un journal où l'on ajoute mais où l'on ne modifie ni ne supprime.

Si quelqu'un demande « et si on retirait l'écran ? » : la tentative passe par le même point d'entrée que
n'importe quelle publication. L'écran ne fait qu'appuyer sur le bouton.

### 6. Ce qui n'est pas là, et quand (2 min)

Le dire avant qu'on le demande, c'est ce qui rend le reste crédible.

- **V2, fin novembre** : le circuit d'admission au cercle restreint avec sa décision humaine et son plafond, la
  signature électronique qualifiée, la data room chiffrée et filigranée, les questions-réponses par document.
- **V3, fin décembre** : négociation, réalisation, génération documentaire OHADA, barème de frais et rétrocession
  CCI, pentest indépendant, fermeture des portes de conformité.
- **V4, début février** : Alerte et Rebond, Deal-Connect complet, Guichet Diaspora.
- **V5, fin février** : intelligence documentaire de la data room.

Aujourd'hui, la plateforme ne prend aucun paiement, n'exécute aucun accord de confidentialité, et ne conserve aucune
donnée réelle.

## Questions qui reviennent

**« Les données sont-elles réelles ? »** Non. Le jeu est synthétique et étiqueté sur chaque écran. Aucune entreprise
togolaise n'y figure.

**« Qui décide qu'une entreprise est Deal-Ready ? »** Un officier nommé de la CCI-Togo. La plateforme rassemble les
pièces, vérifie leur présence, et refuse l'octroi tant qu'une vérification au registre n'est pas enregistrée. Elle
ne décide jamais.

**« Que voit la CCI-Togo d'un dossier ? »** Son état, ses pièces et les données déclarées, pour instruire. Ni le
prix, ni l'identité des repreneurs, ni les échanges. Chaque lecture est tracée.

**« Que se passe-t-il si un repreneur diffuse ce qu'il a vu ? »** Au palier T0, il n'a rien qui identifie
l'entreprise. Au-delà, l'accès est nominatif, tracé, et révocable ; en V2, le compteur de divulgation et le journal
réglementaire rendent la diffusion opposable.

**« Et le paiement ? »** Hors périmètre du v0. La plateforme ne détient pas de fonds et ne fait pas de séquestre :
cela suppose une licence que nous n'avons pas et que nous ne demandons pas.

**« Combien de temps pour ouvrir aux premiers utilisateurs ? »** La mise en service commerciale est prévue au
1er mars 2027, après la fermeture des portes de conformité en V3 et le pentest indépendant. Avant cette date, la
plateforme reste un outil de démonstration et de préparation.

## Si quelque chose casse pendant la démonstration

Ne pas improviser sur la donnée. Les contrôles de fumée passent avant la présentation ; s'ils passent et qu'un écran
se comporte mal en séance, le dire, passer au point suivant, et le noter. Un défaut assumé coûte moins cher qu'une
explication qui se révèle fausse.
