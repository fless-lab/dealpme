# AR-01 — Tension de trésorerie précoce

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Alerte & Rebond**

**Archetype :** `NORMAL`  
**Capability :** `GOVERNED_V0`  
**État initial :** `EARLY_LIQUIDITY_STRESS`  
**État attendu :** `CRISIS_TRIAGE_ACTIVE`

## Objectif de test
Tester le triage confidentiel d’une tension de trésorerie avant cessation de paiement.

## Déclencheur
DSO en hausse, stock lent, covenant proche du seuil mais pas de cessation de paiement.

## Message utilisateur
Le dossier est privé et orienté vers un diagnostic de trésorerie et un expert si nécessaire.

## Acteurs et responsabilités
- **Entreprise** — Déclarer la situation et fournir les éléments
- **DealPME** — Orchestrer le diagnostic et les espaces sécurisés
- **Expert restructuration** — Analyser et proposer des scénarios
- **Conformité** — Valider la confidentialité et les admissions
- **Partenaire institutionnel** — Orienter vers les procédures ou acteurs compétents

## Entrées
- 13 semaines trésorerie — `PRESENT` — SYNTHETIC_EVIDENCE
- DSO — `PRESENT` — SYNTHETIC_EVIDENCE
- stocks — `PRESENT` — SYNTHETIC_EVIDENCE
- covenants — `PRESENT` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Entreprise — Demande créée et identifiée — audit `AR_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `AR_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Expert restructuration — Gate métier/compliance évalué — audit `AR_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Conformité — Décision humaine appliquée lorsqu’elle est requise — audit `AR_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Partenaire institutionnel — CRISIS_TRIAGE_ACTIVE — audit `AR_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Entreprise — Trace exploitable par QA — audit `AR_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **AR-C01** — confidentialité élevée — owner: Entreprise — bloquant
- **AR-C02** — avertissement procédure — owner: DealPME — non bloquant
- **AR-C03** — pas de conseil automatique — owner: Expert restructuration — non bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : Entreprise
- Décision : `CONSENT_TO_CRISIS_WORKSPACE`
- Preuve : L’entreprise confirme l’ouverture du parcours et les informations partagées.

## Interactions de référence
- `PRIMARY_ACTION` — **Démarrer le diagnostic** → `START_DIAGNOSTIC` → `DIAGNOSTIC_ACTIVE` — audit `AR_START_DIAGNOSTIC`
- `SECONDARY_ACTION` — **Inviter un expert** → `REQUEST_TURNAROUND_EXPERT` → `EXPERT_REQUESTED` — audit `AR_REQUEST_TURNAROUND_EXPERT`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer CRISIS_TRIAGE_ACTIVE sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
