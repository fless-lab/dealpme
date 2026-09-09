# EX-02 — Conflit d’intérêts détecté

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Deal-Experts**

**Archetype :** `CONTROL_FAILURE`  
**Capability :** `FUTURE_TARGET`  
**État initial :** `EXPERT_SELECTED_PENDING_CONFLICT_CHECK`  
**État attendu :** `BLOCKED_CONFLICT_OF_INTEREST`

## Objectif de test
Prouver qu’un conflit d’intérêts empêche l’activation de la mission et révoque tout accès.

## Déclencheur
Un cabinet candidat a conseillé le cédant sur l’exercice précédent.

## Message utilisateur
Mission bloquée : le cabinet a conseillé le cédant sur une période couverte par l’audit.

## Acteurs et responsabilités
- **Utilisateur** — Définir le besoin et contracter la mission
- **DealPME** — Orchestrer la demande et les accès techniques
- **Expert** — Exécuter la mission de façon indépendante
- **Conformité** — Vérifier conflit, habilitation et périmètre
- **Cédant** — Autoriser les accès aux pièces de son dossier

## Entrées
- Déclaration d’indépendance — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Historique missions — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Identité cible — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Utilisateur — Demande créée et identifiée — audit `EX_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `EX_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Expert — Gate métier/compliance évalué — audit `EX_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Conformité — Décision humaine appliquée lorsqu’elle est requise — audit `EX_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Cédant — BLOCKED_CONFLICT_OF_INTEREST — audit `EX_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Utilisateur — Trace exploitable par QA — audit `EX_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **EX-C07** — conflit bloque activation — owner: Utilisateur — bloquant
- **EX-C08** — accès jamais ouvert et expiration immédiate de toute habilitation — owner: DealPME — bloquant
- **EX-C09** — réaffectation tracée — owner: Expert — bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : Conformité
- Décision : `REJECT_EXPERT_CONFLICT`
- Preuve : Aucun accès VDR ne peut être accordé au cabinet en conflit.

## Interactions de référence
- `PRIMARY_ACTION` — **Voir le conflit** → `OPEN_CONFLICT` → `CONFLICT_DETAIL` — audit `EX_OPEN_CONFLICT`
- `SECONDARY_ACTION` — **Choisir un autre expert** → `REASSIGN_EXPERT` → `EXPERT_RESELECTION` — audit `EX_REASSIGN_EXPERT`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer BLOCKED_CONFLICT_OF_INTEREST sans exécuter CONTROL_GATE_EVALUATED doit échouer.
- Exécuter une action sensible avec un profil non autorisé doit échouer et être journalisé.
- Supprimer l’interaction contract d’un contrôle visible doit déclencher DEAD_CONTROL.
- Forcer un état de succès interdit malgré la condition de blocage doit être refusé.

## Assertions QA
- Le scénario ne peut atteindre son état cible qu’après satisfaction des gates explicitement définis.
- Chaque contrôle visible possède un interaction contract et produit un changement d’état ou un blocage explicite.
- Les rôles ne voient que le périmètre nécessaire et les événements sensibles sont journalisés.
- Aucun message utilisateur ne présente DealPME comme conseil juridique, fiscal, réglementaire ou financier.
- Les sorties synthétiques sont identifiées comme telles et ne peuvent être confondues avec un dossier réel.

## Prohibited states
- `SUCCESS`
- `COMPLETED`
- `CERTIFIED`
- `ACCESS_GRANTED`
- `CONTACT_SHARED`
- `FILED`
- `CERTIFICATE_ISSUED`

## Provenance
Tous les noms, situations, décisions, preuves et interactions de ce dossier sont fictifs et destinés uniquement au développement, à la démonstration et aux tests DealPME.
