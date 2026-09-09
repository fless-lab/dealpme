# EX-03 — Due diligence fiscale

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Deal-Experts**

**Archetype :** `REMEDIATION`  
**Capability :** `FUTURE_TARGET`  
**État initial :** `RFP_NEEDS_SCOPE_REFINEMENT`  
**État attendu :** `SCOPE_REMEDIATION`

## Objectif de test
Tester une mission fiscale nécessitant clarification du périmètre et des pièces avant accès.

## Déclencheur
Besoin d’un diagnostic fiscal Togo avant fixation des garanties SPA.

## Message utilisateur
Le périmètre doit être précisé avant que l’expert puisse accéder aux documents fiscaux.

## Acteurs et responsabilités
- **Utilisateur** — Définir le besoin et contracter la mission
- **DealPME** — Orchestrer la demande et les accès techniques
- **Expert** — Exécuter la mission de façon indépendante
- **Conformité** — Vérifier conflit, habilitation et périmètre
- **Cédant** — Autoriser les accès aux pièces de son dossier

## Entrées
- Périmètre fiscal — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Liste des entités — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Documents fiscaux — `INCOMPLETE` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Utilisateur — Demande créée et identifiée — audit `EX_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `EX_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Expert — Gate métier/compliance évalué — audit `EX_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Conformité — Décision humaine appliquée lorsqu’elle est requise — audit `EX_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Cédant — SCOPE_REMEDIATION — audit `EX_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Utilisateur — Trace exploitable par QA — audit `EX_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **EX-C04** — périmètre explicite — owner: Utilisateur — bloquant
- **EX-C05** — pas d’accès global — owner: DealPME — non bloquant
- **EX-C06** — contrat direct utilisateur-expert — owner: Expert — non bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : Utilisateur / client
- Décision : `CONFIRM_REVISED_SCOPE`
- Preuve : Le client valide la mission ; la conformité vérifie l’accès temporaire.

## Interactions de référence
- `PRIMARY_ACTION` — **Corriger le périmètre** → `EDIT_SCOPE` → `SCOPE_UPDATED` — audit `EX_EDIT_SCOPE`
- `SECONDARY_ACTION` — **Ajouter pièces requises** → `UPLOAD_SCOPE_EVIDENCE` → `EVIDENCE_RECEIVED` — audit `EX_UPLOAD_SCOPE_EVIDENCE`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer SCOPE_REMEDIATION sans exécuter CONTROL_GATE_EVALUATED doit échouer.
- Exécuter une action sensible avec un profil non autorisé doit échouer et être journalisé.
- Supprimer l’interaction contract d’un contrôle visible doit déclencher DEAD_CONTROL.

## Assertions QA
- Le scénario ne peut atteindre son état cible qu’après satisfaction des gates explicitement définis.
- Chaque contrôle visible possède un interaction contract et produit un changement d’état ou un blocage explicite.
- Les rôles ne voient que le périmètre nécessaire et les événements sensibles sont journalisés.
- Aucun message utilisateur ne présente DealPME comme conseil juridique, fiscal, réglementaire ou financier.
- Les sorties synthétiques sont identifiées comme telles et ne peuvent être confondues avec un dossier réel.

## Prohibited states
- `FINAL_SUCCESS_BEFORE_REMEDIATION`

## Provenance
Tous les noms, situations, décisions, preuves et interactions de ce dossier sont fictifs et destinés uniquement au développement, à la démonstration et aux tests DealPME.
