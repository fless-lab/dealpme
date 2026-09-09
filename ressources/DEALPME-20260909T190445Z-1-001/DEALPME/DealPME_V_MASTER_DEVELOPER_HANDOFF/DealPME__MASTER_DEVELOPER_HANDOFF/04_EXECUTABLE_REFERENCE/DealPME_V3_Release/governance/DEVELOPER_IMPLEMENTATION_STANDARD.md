# DealPME — Standard d’implémentation exécutable v3

## 1. Finalité

Le fixture PT-001 n’est pas une maquette marketing. Il est le **golden reference** qui précise ce que les surfaces Pass Transmission doivent afficher, permettre, bloquer et journaliser. Toute divergence doit être documentée et approuvée avant implémentation.

## 2. Règle zéro : aucun contrôle mort

Chaque `button`, lien, onglet, filtre, sélecteur, CTA, action de ligne ou contrôle modal visible doit porter un `data-control-id` présent dans `UI_INTERACTION_REGISTRY.md` et dans `data/interaction-contract.json`.

Pour chaque contrôle, l’implémentation cible doit avoir :

1. un déclencheur ;
2. un gate d’autorisation ;
3. une source de données ;
4. un état de succès ;
5. un état bloqué ou d’erreur ;
6. un événement d’audit lorsque l’action est sensible.

Un contrôle visible sans comportement déterministe est un **release blocker**.

## 3. Divulgation T0 / T1 / T2

- **T0** : signal d’existence et données non sensibles.
- **T1 share deal** : teaser anonymisé et non indexable ; aucune identité, RCCM, attente de prix, valorisation, termes d’offre, lien VDR ou document T2.
- **T2** : identité et termes uniquement après les gates définis.
- Les contrôles d’accès doivent être appliqués côté serveur dans la plateforme réelle. Le frontend n’est jamais la barrière de sécurité.

## 4. Données financières

La surface doit présenter une seule vérité canonique :

- compte de résultat 5 ans ;
- bilan 3 ans ;
- flux de trésorerie 3 ans ;
- BFR, DSO, DPO, jours de stock ;
- dette brute, trésorerie et dette nette ;
- provenance / année / unité ;
- mention « données déclarées par le cédant — non auditées » lorsque le périmètre de certification ne couvre pas l’exactitude financière.

L’attente de prix du cédant ne doit jamais être appelée « valorisation DealPME ».

## 5. Transaction Workspace

La surface Transaction doit conserver :

- type d’opération et forme juridique ;
- participation proposée ;
- attente du cédant et source ;
- dette, trésorerie et mécanisme BFR ;
- calendrier ;
- état de la contrepartie ;
- progression Intérêt → Qualification → Admission → NDA → T2 → VDR → LOI → Audit confirmatoire → Documentation → Résultat.

Aucun stade ne peut être sauté sans règle documentée.

## 6. Risques

Un risque n’est pas une note libre. Chaque objet doit avoir :

`risk_id`, catégorie, titre, gravité, probabilité, description, preuve(s), responsable, mesure de réduction, statut, question acheteur et liens documentaires.

## 7. VDR

Le gold standard doit couvrir :

- arborescence OHADA de diligence ;
- accès authentifié et lié à une session ;
- URL de document courte durée dans l’implémentation cible ;
- téléchargement désactivé par défaut ;
- filigrane dynamique ;
- trace de consultation ;
- Q&R liée au document ;
- révocation effective ;
- message de protection honnête : dissuasion, attribution et recours, pas prévention absolue des captures.

## 8. Q&R

Chaque fil comporte : identifiant, catégorie, pièce liée, auteur, destinataire, date, statut, visibilité, réponse et pièces jointes. Toute création/réponse/clôture doit être journalisable.

## 9. Français natif

Le français est la langue source. Les nombres FCFA sont sans décimales, les dates de l’interface sont au format français, les libellés doivent être rédigés nativement et les termes juridiques OHADA/RCCM ne doivent pas être transformés artificiellement.

## 10. Definition of Done

Une surface est livrable lorsque :

- toutes les données attendues sont présentes ;
- chaque contrôle visible a un contrat ;
- les interactions positives et négatives sont testées ;
- les permissions sont testées côté serveur dans le produit cible ;
- les états de chargement, absence de données, blocage et erreur existent ;
- les événements d’audit sont spécifiés ;
- les tests de divulgation passent ;
- les tests de cohérence financière passent ;
- les tests de contrôle mort passent ;
- le rendu desktop et mobile est contrôlé ;
- aucune affirmation de conseil, de garantie, de valorisation DealPME ou de protection absolue de la VDR n’est introduite.
