# DR-01 — Certification prête

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Deal-Ready**

**Archetype :** `NORMAL`  
**Capability :** `GOVERNED_V0`  
**État initial :** `DOSSIER_COMPLETE_REVIEWABLE`  
**État attendu :** `CERTIFIED_BY_NAMED_OFFICER`

## Objectif de test
Tester une certification aboutie sans décision automatique.

## Déclencheur
Dossier complet à 94 %, pièces corporate/fiscales cohérentes, expert sans réserve majeure.

## Message utilisateur
Le dossier a franchi les contrôles de complétude. La décision finale appartient à un agent CCI nommé.

## Acteurs et responsabilités
- **Entreprise** — Constituer et corriger le dossier
- **DealPME** — Orchestrer le workflow et la traçabilité
- **Expert indépendant** — Réaliser le diagnostic dans le périmètre mandaté
- **CCI-Togo** — Décider de la certification et de son retrait
- **Conformité** — Contrôler les incompatibilités et conflits

## Entrées
- RCCM vérifié — `PRESENT` — SYNTHETIC_EVIDENCE
- Checklist corporate complète — `PRESENT` — SYNTHETIC_EVIDENCE
- Pièces fiscales présentes — `PRESENT` — SYNTHETIC_EVIDENCE
- Rapport expert signé — `PRESENT` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Entreprise — Demande créée et identifiée — audit `DR_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `DR_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Expert indépendant — Gate métier/compliance évalué — audit `DR_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — CCI-Togo — Décision humaine appliquée lorsqu’elle est requise — audit `DR_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — CERTIFIED_BY_NAMED_OFFICER — audit `DR_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Entreprise — Trace exploitable par QA — audit `DR_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **DR-C01** — Complétude ≥ seuil — owner: Entreprise — bloquant
- **DR-C02** — décision nominative — owner: DealPME — non bloquant
- **DR-C03** — périmètre du label explicite — owner: Expert indépendant — non bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : CCI-Togo — agent certificateur
- Décision : `ATTRIBUER_LE_LABEL`
- Preuve : Décision nominative, périmètre et date d’expiration enregistrés.

## Interactions de référence
- `PRIMARY_ACTION` — **Soumettre à décision** → `SUBMIT_HUMAN_DECISION` → `CERTIFICATION_REVIEW_QUEUE` — audit `DR_SUBMIT_HUMAN_DECISION`
- `SECONDARY_ACTION` — **Voir le périmètre** → `OPEN_SCOPE` → `SCOPE_VIEW` — audit `DR_OPEN_SCOPE`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer CERTIFIED_BY_NAMED_OFFICER sans exécuter CONTROL_GATE_EVALUATED doit échouer.
- Exécuter une action sensible avec un profil non autorisé doit échouer et être journalisé.
- Supprimer l’interaction contract d’un contrôle visible doit déclencher DEAD_CONTROL.

## Assertions QA
- Le scénario ne peut atteindre son état cible qu’après satisfaction des gates explicitement définis.
- Chaque contrôle visible possède un interaction contract et produit un changement d’état ou un blocage explicite.
- Les rôles ne voient que le périmètre nécessaire et les événements sensibles sont journalisés.
- Aucun message utilisateur ne présente DealPME comme conseil juridique, fiscal, réglementaire ou financier.
- Les sorties synthétiques sont identifiées comme telles et ne peuvent être confondues avec un dossier réel.

## Prohibited states
Aucun état spécifique supplémentaire ; appliquer les interdictions générales du service.

## Provenance
Tous les noms, situations, décisions, preuves et interactions de ce dossier sont fictifs et destinés uniquement au développement, à la démonstration et aux tests DealPME.
