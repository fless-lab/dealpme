# AR-03 — Portefeuille d’actifs bancaire

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Alerte & Rebond**

**Archetype :** `CONTROL_FAILURE`  
**Capability :** `GOVERNED_V0`  
**État initial :** `BANK_ASSET_PORTFOLIO_PROPOSED`  
**État attendu :** `BLOCKED_MANUAL_AGREEMENT_GATE`

## Objectif de test
Prouver qu’un portefeuille d’actifs bancaire ne peut être publié sans accord manuel et revue juridique.

## Déclencheur
Banque souhaite céder véhicules et équipements saisis.

## Message utilisateur
Publication bloquée : l’onboarding banque et l’accord spécifique ne sont pas finalisés.

## Acteurs et responsabilités
- **Entreprise** — Déclarer la situation et fournir les éléments
- **DealPME** — Orchestrer le diagnostic et les espaces sécurisés
- **Expert restructuration** — Analyser et proposer des scénarios
- **Conformité** — Valider la confidentialité et les admissions
- **Partenaire institutionnel** — Orienter vers les procédures ou acteurs compétents

## Entrées
- Inventaire actifs — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Titres/droits — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Accord banque — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Entreprise — Demande créée et identifiée — audit `AR_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `AR_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Expert restructuration — Gate métier/compliance évalué — audit `AR_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Conformité — Décision humaine appliquée lorsqu’elle est requise — audit `AR_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Partenaire institutionnel — BLOCKED_MANUAL_AGREEMENT_GATE — audit `AR_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Entreprise — Trace exploitable par QA — audit `AR_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **AR-C07** — onboarding banque manuel — owner: Entreprise — bloquant
- **AR-C08** — accord spécifique requis — owner: DealPME — bloquant
- **AR-C09** — pas d’enchère auto sans activation — owner: Expert restructuration — bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : DealPME + banque + conseil
- Décision : `HOLD_UNTIL_AGREEMENT`
- Preuve : Aucune enchère/publication automatique sous ce scénario.

## Interactions de référence
- `PRIMARY_ACTION` — **Voir les prérequis** → `OPEN_GATE_REQUIREMENTS` → `GATE_REQUIREMENTS` — audit `AR_OPEN_GATE_REQUIREMENTS`
- `SECONDARY_ACTION` — **Déposer l’accord** → `UPLOAD_AGREEMENT` → `AGREEMENT_PENDING_REVIEW` — audit `AR_UPLOAD_AGREEMENT`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer BLOCKED_MANUAL_AGREEMENT_GATE sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
