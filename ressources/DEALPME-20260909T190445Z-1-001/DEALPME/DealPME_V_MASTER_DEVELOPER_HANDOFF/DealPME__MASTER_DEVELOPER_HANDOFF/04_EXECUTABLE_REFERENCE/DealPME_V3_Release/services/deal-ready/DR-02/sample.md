# DR-02 — Remédiation requise

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Deal-Ready**

**Archetype :** `REMEDIATION`  
**Capability :** `GOVERNED_V0`  
**État initial :** `PREFLIGHT_INCOMPLETE`  
**État attendu :** `REMEDIATION_OPEN`

## Objectif de test
Tester la boucle de remédiation avant toute décision de certification.

## Déclencheur
Score 76 %, baux incomplets, rapprochement fiscal à corriger, dépendance dirigeant non documentée.

## Message utilisateur
Des écarts documentaires doivent être corrigés avant une nouvelle revue.

## Acteurs et responsabilités
- **Entreprise** — Constituer et corriger le dossier
- **DealPME** — Orchestrer le workflow et la traçabilité
- **Expert indépendant** — Réaliser le diagnostic dans le périmètre mandaté
- **CCI-Togo** — Décider de la certification et de son retrait
- **Conformité** — Contrôler les incompatibilités et conflits

## Entrées
- Baux partiels — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Rapprochement fiscal incomplet — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Note dépendance dirigeant absente — `INCOMPLETE` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Entreprise — Demande créée et identifiée — audit `DR_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `DR_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Expert indépendant — Gate métier/compliance évalué — audit `DR_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — CCI-Togo — Décision humaine appliquée lorsqu’elle est requise — audit `DR_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — REMEDIATION_OPEN — audit `DR_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Entreprise — Trace exploitable par QA — audit `DR_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **DR-C01** — aucun auto-label — owner: Entreprise — bloquant
- **DR-C04** — remédiation tracée — owner: DealPME — non bloquant
- **DR-C05** — re-soumission requise — owner: Expert indépendant — non bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : CCI-Togo — agent certificateur
- Décision : `REQUEST_REMEDIATION`
- Preuve : Aucune attribution avant correction et nouvelle revue.

## Interactions de référence
- `PRIMARY_ACTION` — **Ouvrir le plan de remédiation** → `OPEN_REMEDIATION` → `REMEDIATION_WORKSPACE` — audit `DR_OPEN_REMEDIATION`
- `SECONDARY_ACTION` — **Téléverser une pièce** → `UPLOAD_EVIDENCE` → `EVIDENCE_RECEIVED` — audit `DR_UPLOAD_EVIDENCE`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer REMEDIATION_OPEN sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
