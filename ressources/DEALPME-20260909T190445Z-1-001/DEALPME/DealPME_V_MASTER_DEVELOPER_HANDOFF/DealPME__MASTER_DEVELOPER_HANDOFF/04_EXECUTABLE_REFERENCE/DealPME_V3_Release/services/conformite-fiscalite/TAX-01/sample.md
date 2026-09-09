# TAX-01 — Simulation fiscale de cession

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Conformité & Fiscalité**

**Archetype :** `NORMAL`  
**Capability :** `PARTNER_DEPENDENT`  
**État initial :** `TAX_DATA_COMPLETE`  
**État attendu :** `INDICATIVE_SIMULATION_READY`

## Objectif de test
Tester une simulation fiscale préparatoire fournie par le module partenaire avec avertissement clair.

## Déclencheur
Le cédant souhaite estimer les incidences fiscales à titre préparatoire.

## Message utilisateur
Simulation indicative disponible ; toute décision nécessite la validation d’un professionnel qualifié.

## Acteurs et responsabilités
- **Entreprise** — Fournir les données fiscales exactes
- **DealPME** — Orchestrer l’interface et journaliser le statut
- **Partenaire fiscal** — Calculer, déposer ou délivrer selon son habilitation
- **Conseil fiscal** — Interpréter les questions nécessitant un avis
- **Conformité** — Empêcher toute fausse réussite en cas de dépendance indisponible

## Entrées
- Hypothèses prix vendeur — `PRESENT` — SYNTHETIC_EVIDENCE
- Nature cession — `PRESENT` — SYNTHETIC_EVIDENCE
- Données fiscales — `PRESENT` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Entreprise — Demande créée et identifiée — audit `TAX_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `TAX_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Partenaire fiscal — Gate métier/compliance évalué — audit `TAX_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Conseil fiscal — Décision humaine appliquée lorsqu’elle est requise — audit `TAX_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — INDICATIVE_SIMULATION_READY — audit `TAX_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Entreprise — Trace exploitable par QA — audit `TAX_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **TAX-C01** — simulation indicative — owner: Entreprise — bloquant
- **TAX-C02** — source partenaire — owner: DealPME — non bloquant
- **TAX-C03** — pas d’avis DealPME — owner: Partenaire fiscal — non bloquant

## Décision humaine
- Requise : **non**
- Propriétaire : Partenaire fiscal
- Décision : `PARTNER_CALCULATION`
- Preuve : DealPME orchestre l’interface sans fournir d’avis fiscal.

## Interactions de référence
- `PRIMARY_ACTION` — **Lancer la simulation** → `RUN_TAX_SIMULATION` → `SIMULATION_READY` — audit `TAX_RUN_TAX_SIMULATION`
- `SECONDARY_ACTION` — **Demander un expert** → `REQUEST_TAX_EXPERT` → `EXPERT_REQUESTED` — audit `TAX_REQUEST_TAX_EXPERT`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer INDICATIVE_SIMULATION_READY sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
