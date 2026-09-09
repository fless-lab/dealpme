# VDR-02 — Accès révoqué

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — VDR & Q&R**

**Archetype :** `CONTROL_FAILURE`  
**Capability :** `GOVERNED_V0`  
**État initial :** `VDR_ACTIVE_CONFLICT_DISCOVERED`  
**État attendu :** `ACCESS_REVOKED`

## Objectif de test
Prouver que la révocation interdit toute consultation et invalide les liens actifs.

## Déclencheur
Le cédant détecte un conflit concurrentiel après admission.

## Message utilisateur
Accès révoqué par le cédant ; aucune nouvelle consultation n’est autorisée.

## Acteurs et responsabilités
- **Cédant** — Contrôler les accès et les permissions de téléchargement
- **Acquéreur** — Consulter et poser des questions dans son périmètre
- **DealPME** — Appliquer les autorisations, filigranes et journaux
- **Conseil** — Intervenir dans le périmètre de son mandat
- **Conformité** — Traiter les anomalies et révocations

## Entrées
- Décision de révocation — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Motif — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Sessions/URLs actives — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Cédant — Demande créée et identifiée — audit `VDR_REQUEST_CREATED`
2. **INPUTS_CHECKED** — Acquéreur — Entrées et habilitations contrôlées — audit `VDR_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — DealPME — Gate métier/compliance évalué — audit `VDR_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Conseil — Décision humaine appliquée lorsqu’elle est requise — audit `VDR_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — ACCESS_REVOKED — audit `VDR_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Cédant — Trace exploitable par QA — audit `VDR_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **VDR-C07** — refus après révocation — owner: Cédant — bloquant
- **VDR-C08** — propagation ≤60s — owner: Acquéreur — bloquant
- **VDR-C09** — notification propriétaire — owner: DealPME — bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : Cédant / Conformité selon motif
- Décision : `REVOKE_ACCESS`
- Preuve : Révocation enregistrée et propagation attendue en moins de 60 secondes.

## Interactions de référence
- `PRIMARY_ACTION` — **Voir la décision** → `OPEN_REVOCATION` → `REVOCATION_DETAIL` — audit `VDR_OPEN_REVOCATION`
- `SECONDARY_ACTION` — **Tenter d’ouvrir un document** → `ATTEMPT_DOCUMENT_OPEN` → `ACCESS_DENIED` — audit `VDR_ATTEMPT_DOCUMENT_OPEN`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer ACCESS_REVOKED sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
