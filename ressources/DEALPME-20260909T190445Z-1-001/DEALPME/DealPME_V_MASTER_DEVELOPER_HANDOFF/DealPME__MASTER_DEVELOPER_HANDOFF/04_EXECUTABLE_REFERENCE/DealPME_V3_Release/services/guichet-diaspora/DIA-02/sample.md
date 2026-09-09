# DIA-02 — Contrainte de change / autorisation

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Guichet Diaspora**

**Archetype :** `CONTROL_FAILURE`  
**Capability :** `GOVERNED_V0`  
**État initial :** `CROSS_BORDER_TRANSFER_NEAR_COMPLETION`  
**État attendu :** `COMPLIANCE_HOLD_EXTERNAL_REVIEW`

## Objectif de test
Prouver qu’une question de change/autorisation suspend l’étape sans avis autonome DealPME.

## Déclencheur
Investisseur hors UEMOA proche de la réalisation mais transfert soumis à vérification réglementaire.

## Message utilisateur
Opération mise en attente : validation de la banque/conseil compétent requise sur le transfert transfrontalier.

## Acteurs et responsabilités
- **Investisseur diaspora** — Déclarer sa thèse, son identité et sa capacité
- **DealPME** — Qualifier l’accès, faire correspondre et organiser les rendez-vous
- **Cédant** — Autoriser la divulgation détaillée
- **Banque / conseil** — Traiter change, financement et autorisations
- **Conformité** — Appliquer les contrôles transfrontaliers

## Entrées
- Dossier transfert — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Devise/source fonds — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Pays origine — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Investisseur diaspora — Demande créée et identifiée — audit `DIA_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `DIA_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Cédant — Gate métier/compliance évalué — audit `DIA_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Banque / conseil — Décision humaine appliquée lorsqu’elle est requise — audit `DIA_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — COMPLIANCE_HOLD_EXTERNAL_REVIEW — audit `DIA_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Investisseur diaspora — Trace exploitable par QA — audit `DIA_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **DIA-C07** — hold conformité — owner: Investisseur diaspora — bloquant
- **DIA-C08** — routage banque/conseil — owner: DealPME — bloquant
- **DIA-C09** — aucun avis autonome — owner: Cédant — bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : Banque / conseil compétent
- Décision : `EXTERNAL_AUTHORIZATION_REVIEW`
- Preuve : DealPME enregistre le statut et n’émet pas d’avis réglementaire.

## Interactions de référence
- `PRIMARY_ACTION` — **Voir les exigences** → `OPEN_EXTERNAL_REQUIREMENTS` → `REQUIREMENTS_VIEW` — audit `DIA_OPEN_EXTERNAL_REQUIREMENTS`
- `SECONDARY_ACTION` — **Demander un rendez-vous banque** → `REQUEST_BANK_APPOINTMENT` → `BANK_APPOINTMENT_REQUESTED` — audit `DIA_REQUEST_BANK_APPOINTMENT`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer COMPLIANCE_HOLD_EXTERNAL_REVIEW sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
