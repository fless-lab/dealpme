# Consignes persistantes DealPME

## Suivi des travaux : ne pas perdre les compléments dans le contexte

Règle explicite du chef de projet : **toute situation qui révèle un travail supplémentaire doit être
traduite immédiatement en tâche persistante**, sans attendre la fin du lot ou une nouvelle conversation.
Cela inclut une nouvelle exigence, un trou de câblage, une intégration supplémentaire, une sous-recette,
une correction hors portée initiale ou une activation/validation fournisseur restant à effectuer.

- Lire `docs/PLAN_EXECUTION.md` et `devX/build_suivi.py` avant de reprendre un lot.
- Pour un complément distinct, ajouter une tâche sous un **nouvel identifiant stable** dans le générateur,
  avec `followup(...)`, en append après les tâches existantes. La relier au lot, aux tâches d'origine,
  aux dépendances, à un responsable, aux dates prévues, à une charge estimée et à un critère de clôture vérifiable.
- Un titre général ou un commentaire ne remplace pas une tâche actionnable pour un complément distinct.
  Réutiliser une tâche qui couvre déjà exactement le travail ; ne pas dupliquer les simples étapes de son exécution.
- Ne pas se limiter à la liste temporaire de la session, à un message ou à une note de reprise.
  Reporter les nouveaux travaux dans le suivi **avant de poursuivre** et avant tout changement de contexte.
- Les tâches non commencées restent à 0 %, sans date de clôture. Distinguer « À faire sans accès » de
  « Bloquée par un accès précis ». Une tâche bloquée non exécutée ne reçoit pas l'avancement par défaut de 25 %.
- Conserver les acquis : ne pas rouvrir une tâche livrée pour y dissimuler un nouveau complément ;
  créer la tâche liée. Une console livrée ne clôt pas ses validations de câblage, d'activation ou de recette réelle.
- Un mock, un test de contrat ou la réception d'une clé ne constituent pas une recette du fournisseur.
  Garder les sous-recettes ouvertes jusqu'aux preuves correspondantes.

## Sources et invariants du classeur

- Source persistante : `devX/build_suivi.py` ; classeur actif : `DealPME_Suivi.xlsx`.
- Régénérer avec `python3 devX/build_suivi.py` après mise à jour du suivi et aligner `docs/PLAN_EXECUTION.md`.
- Préserver identifiants, libellés, charges et dates des tâches antérieures, ainsi que leurs acquis et clôtures.
  Les charges des nouveaux compléments s'ajoutent explicitement ; elles ne sont pas prélevées silencieusement ailleurs.
- Ne pas renuméroter les tâches ni prolonger les fenêtres V1–V5. Les nouvelles tâches restent dans les
  fenêtres des versions existantes ; un blocage ne reporte pas automatiquement le calendrier.
- Convention de clôture du suivi : date dans la fenêtre prévue ou après, jamais avant le début prévu.
- Vérifier le classeur contre HEAD : anciennes tâches préservées, nouveaux IDs uniques, rattachement à un
  lot, statuts/dates/charges cohérents et formules recalculées sans erreur.
- `DealPME_Suivi.ods` est une archive obsolète : ne pas la modifier.

## Reprise actuelle

L05 : **V1-110/111 et leurs compléments V1-117/118/119 sont éprouvés hors compte fournisseur** :
27 routes dans la matrice, précontrôle et bascule/reprise testés. V1-112 à 115 portent activation et
recettes réelles ; V1-116 porte les corrections finales et la clôture du lot. V1-107 garde la
qualification captation/export ouverte. Preuves : `qa/l05-wiring-verification.json`.
Toujours vérifier le statut courant dans le générateur avant d'agir, cette section étant un repère de reprise.
