# CNX-02 — Speed meetings ciblés

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Deal-Connect**

**Archetype :** `CONTROL_FAILURE`  
**Capability :** `GOVERNED_V0`  
**État initial :** `MATCH_PROPOSED_NO_MUTUAL_OPTIN`  
**État attendu :** `BLOCKED_CONSENT_REQUIRED`

## Objectif de test
Prouver qu’un speed-meeting ne peut être confirmé sans accord mutuel.

## Déclencheur
CCI organise 40 rencontres entre PME et distributeurs régionaux.

## Message utilisateur
Rendez-vous non confirmé : le consentement de la seconde partie est encore requis.

## Acteurs et responsabilités
- **CCI-Togo** — Programmer et piloter l’événement
- **Exposant** — Publier son profil et traiter les demandes
- **Participant** — Demander un contact ou un rendez-vous
- **DealPME** — Gérer inscriptions, consentements et sessions
- **Support** — Assurer le mode dégradé et l’assistance

## Entrées
- Match proposé — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Opt-in A — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Opt-in B manquant — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — CCI-Togo — Demande créée et identifiée — audit `CNX_REQUEST_CREATED`
2. **INPUTS_CHECKED** — Exposant — Entrées et habilitations contrôlées — audit `CNX_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Participant — Gate métier/compliance évalué — audit `CNX_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — DealPME — Décision humaine appliquée lorsqu’elle est requise — audit `CNX_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Support — BLOCKED_CONSENT_REQUIRED — audit `CNX_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — CCI-Togo — Trace exploitable par QA — audit `CNX_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **CNX-C07** — pas de contact sans consentement — owner: CCI-Togo — bloquant
- **CNX-C08** — pas de meeting confirmé — owner: Exposant — bloquant
- **CNX-C09** — suppression/trace — owner: Participant — bloquant

## Décision humaine
- Requise : **non**
- Propriétaire : N/A
- Décision : `CONSENT_GATE`
- Preuve : CONTACT_SHARED et MEETING_CONFIRMED sont interdits sans opt-in mutuel.

## Interactions de référence
- `PRIMARY_ACTION` — **Envoyer la demande** → `REQUEST_MEETING` → `MEETING_REQUESTED` — audit `CNX_REQUEST_MEETING`
- `SECONDARY_ACTION` — **Tenter de voir le contact** → `ATTEMPT_CONTACT_VIEW` → `CONSENT_REQUIRED` — audit `CNX_ATTEMPT_CONTACT_VIEW`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer BLOCKED_CONSENT_REQUIRED sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
