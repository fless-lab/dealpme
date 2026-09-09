# VDR-03 — Comportement anormal

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — VDR & Q&R**

**Archetype :** `REMEDIATION`  
**Capability :** `GOVERNED_V0`  
**État initial :** `VDR_ACTIVE_ANOMALY_DETECTED`  
**État attendu :** `SECURITY_REVIEW_HOLD`

## Objectif de test
Tester une suspension temporaire à la suite d’un comportement anormal.

## Déclencheur
Volume de consultation inhabituel et tentatives répétées de capture.

## Message utilisateur
L’accès est temporairement suspendu pendant la revue de sécurité ; les URL actives sont invalidées.

## Acteurs et responsabilités
- **Cédant** — Contrôler les accès et les permissions de téléchargement
- **Acquéreur** — Consulter et poser des questions dans son périmètre
- **DealPME** — Appliquer les autorisations, filigranes et journaux
- **Conseil** — Intervenir dans le périmètre de son mandat
- **Conformité** — Traiter les anomalies et révocations

## Entrées
- Journal de consultation — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Signal anomalie — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Sessions actives — `INCOMPLETE` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Cédant — Demande créée et identifiée — audit `VDR_REQUEST_CREATED`
2. **INPUTS_CHECKED** — Acquéreur — Entrées et habilitations contrôlées — audit `VDR_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — DealPME — Gate métier/compliance évalué — audit `VDR_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Conseil — Décision humaine appliquée lorsqu’elle est requise — audit `VDR_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — SECURITY_REVIEW_HOLD — audit `VDR_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Cédant — Trace exploitable par QA — audit `VDR_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **VDR-C04** — suspension immédiate — owner: Cédant — bloquant
- **VDR-C05** — URLs invalidées — owner: Acquéreur — non bloquant
- **VDR-C06** — décision de réactivation humaine — owner: DealPME — non bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : Conformité / sécurité
- Décision : `PLACE_SECURITY_HOLD`
- Preuve : Réactivation seulement après décision documentée.

## Interactions de référence
- `PRIMARY_ACTION` — **Voir l’alerte** → `OPEN_SECURITY_ALERT` → `SECURITY_ALERT_DETAIL` — audit `VDR_OPEN_SECURITY_ALERT`
- `SECONDARY_ACTION` — **Demander réexamen** → `REQUEST_REVIEW` → `SECURITY_REVIEW_REQUESTED` — audit `VDR_REQUEST_REVIEW`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer SECURITY_REVIEW_HOLD sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
