# CNX-01 — Salon agro UEMOA

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Deal-Connect**

**Archetype :** `NORMAL`  
**Capability :** `GOVERNED_V0`  
**État initial :** `EVENT_PUBLISHED_REGISTRATION_OPEN`  
**État attendu :** `LIVE_EVENT_ACTIVE`

## Objectif de test
Tester un salon sectoriel avec inscriptions, stands et rendez-vous consentis.

## Déclencheur
120 inscrits, 28 exposants, 62 demandes de rendez-vous.

## Message utilisateur
Salon actif : les demandes de contact restent soumises au consentement de chaque partie.

## Acteurs et responsabilités
- **CCI-Togo** — Programmer et piloter l’événement
- **Exposant** — Publier son profil et traiter les demandes
- **Participant** — Demander un contact ou un rendez-vous
- **DealPME** — Gérer inscriptions, consentements et sessions
- **Support** — Assurer le mode dégradé et l’assistance

## Entrées
- Programme — `PRESENT` — SYNTHETIC_EVIDENCE
- 120 inscrits — `PRESENT` — SYNTHETIC_EVIDENCE
- 28 exposants — `PRESENT` — SYNTHETIC_EVIDENCE
- Consentements — `PRESENT` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — CCI-Togo — Demande créée et identifiée — audit `CNX_REQUEST_CREATED`
2. **INPUTS_CHECKED** — Exposant — Entrées et habilitations contrôlées — audit `CNX_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Participant — Gate métier/compliance évalué — audit `CNX_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — DealPME — Décision humaine appliquée lorsqu’elle est requise — audit `CNX_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Support — LIVE_EVENT_ACTIVE — audit `CNX_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — CCI-Togo — Trace exploitable par QA — audit `CNX_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **CNX-C01** — opt-in contact — owner: CCI-Togo — bloquant
- **CNX-C02** — rendez-vous mutuel — owner: Exposant — non bloquant
- **CNX-C03** — journal événement — owner: Participant — non bloquant

## Décision humaine
- Requise : **non**
- Propriétaire : N/A
- Décision : `EVENT_OPERATIONS`
- Preuve : Les rendez-vous sont confirmés uniquement après accord mutuel.

## Interactions de référence
- `PRIMARY_ACTION` — **Réserver un rendez-vous** → `BOOK_MEETING` → `MEETING_REQUESTED` — audit `CNX_BOOK_MEETING`
- `SECONDARY_ACTION` — **Demander un contact** → `REQUEST_CONTACT` → `CONTACT_REQUESTED` — audit `CNX_REQUEST_CONTACT`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer LIVE_EVENT_ACTIVE sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
