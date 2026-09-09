# CNX-03 — Connexion faible

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Deal-Connect**

**Archetype :** `REMEDIATION`  
**Capability :** `GOVERNED_V0`  
**État initial :** `VIDEO_SESSION_POOR_NETWORK`  
**État attendu :** `AUDIO_FALLBACK_ACTIVE`

## Objectif de test
Tester la dégradation automatique de la vidéo vers l’audio en faible débit.

## Déclencheur
Participants ruraux ont une qualité réseau insuffisante pour la vidéo.

## Message utilisateur
Connexion faible détectée : la session bascule en audio afin de préserver le rendez-vous.

## Acteurs et responsabilités
- **CCI-Togo** — Programmer et piloter l’événement
- **Exposant** — Publier son profil et traiter les demandes
- **Participant** — Demander un contact ou un rendez-vous
- **DealPME** — Gérer inscriptions, consentements et sessions
- **Support** — Assurer le mode dégradé et l’assistance

## Entrées
- Test réseau — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Session planifiée — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Consentements — `INCOMPLETE` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — CCI-Togo — Demande créée et identifiée — audit `CNX_REQUEST_CREATED`
2. **INPUTS_CHECKED** — Exposant — Entrées et habilitations contrôlées — audit `CNX_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Participant — Gate métier/compliance évalué — audit `CNX_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — DealPME — Décision humaine appliquée lorsqu’elle est requise — audit `CNX_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Support — AUDIO_FALLBACK_ACTIVE — audit `CNX_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — CCI-Togo — Trace exploitable par QA — audit `CNX_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **CNX-C04** — dégradation vidéo→audio — owner: CCI-Togo — bloquant
- **CNX-C05** — pas de perte de rendez-vous — owner: Exposant — non bloquant
- **CNX-C06** — confidentialité inchangée — owner: Participant — non bloquant

## Décision humaine
- Requise : **non**
- Propriétaire : N/A
- Décision : `NETWORK_ADAPTATION`
- Preuve : Aucun contact supplémentaire n’est partagé sans consentement.

## Interactions de référence
- `PRIMARY_ACTION` — **Passer en audio** → `SWITCH_TO_AUDIO` → `AUDIO_SESSION` — audit `CNX_SWITCH_TO_AUDIO`
- `SECONDARY_ACTION` — **Tester la connexion** → `RUN_NETWORK_TEST` → `NETWORK_RESULT` — audit `CNX_RUN_NETWORK_TEST`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer AUDIO_FALLBACK_ACTIVE sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
