# DR-03 — Certification différée

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Deal-Ready**

**Archetype :** `CONTROL_FAILURE`  
**Capability :** `GOVERNED_V0`  
**État initial :** `IDENTITY_GOVERNANCE_MISMATCH`  
**État attendu :** `BLOCKED_COMPLIANCE_REVIEW`

## Objectif de test
Prouver qu’une incohérence de gouvernance bloque la certification.

## Déclencheur
Incohérence entre RCCM, actionnariat déclaré et pièces de gouvernance.

## Message utilisateur
La certification est suspendue : l’actionnariat déclaré ne concorde pas avec les pièces RCCM/gouvernance.

## Acteurs et responsabilités
- **Entreprise** — Constituer et corriger le dossier
- **DealPME** — Orchestrer le workflow et la traçabilité
- **Expert indépendant** — Réaliser le diagnostic dans le périmètre mandaté
- **CCI-Togo** — Décider de la certification et de son retrait
- **Conformité** — Contrôler les incompatibilités et conflits

## Entrées
- RCCM — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Cap table déclarée — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- PV gouvernance — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Entreprise — Demande créée et identifiée — audit `DR_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `DR_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Expert indépendant — Gate métier/compliance évalué — audit `DR_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — CCI-Togo — Décision humaine appliquée lorsqu’elle est requise — audit `DR_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — BLOCKED_COMPLIANCE_REVIEW — audit `DR_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Entreprise — Trace exploitable par QA — audit `DR_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **DR-C06** — incohérence bloquante — owner: Entreprise — bloquant
- **DR-C07** — aucune attribution pendant investigation — owner: DealPME — bloquant
- **DR-C08** — conflit séparé du workflow technique — owner: Expert indépendant — bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : CCI-Togo + Conformité
- Décision : `DEFER_AND_INVESTIGATE`
- Preuve : Le succès CERTIFIED est interdit tant que l’écart n’est pas résolu.

## Interactions de référence
- `PRIMARY_ACTION` — **Voir les écarts** → `OPEN_BLOCKERS` → `BLOCKER_REGISTER` — audit `DR_OPEN_BLOCKERS`
- `SECONDARY_ACTION` — **Demander clarification** → `REQUEST_CLARIFICATION` → `CLARIFICATION_REQUESTED` — audit `DR_REQUEST_CLARIFICATION`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer BLOCKED_COMPLIANCE_REVIEW sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
