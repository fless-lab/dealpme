# VDR-01 — Audit acquéreur normal

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — VDR & Q&R**

**Archetype :** `NORMAL`  
**Capability :** `GOVERNED_V0`  
**État initial :** `NDA_EXECUTED_T2_GRANTED`  
**État attendu :** `VDR_ACTIVE`

## Objectif de test
Tester une diligence normale avec accès limité dans le temps, filigrane et Q&R.

## Déclencheur
NDA exécuté ; accès à 7 dossiers sur 10 pour 21 jours.

## Message utilisateur
Accès actif pour 21 jours sur 7 dossiers autorisés ; téléchargement désactivé sauf autorisation explicite.

## Acteurs et responsabilités
- **Cédant** — Contrôler les accès et les permissions de téléchargement
- **Acquéreur** — Consulter et poser des questions dans son périmètre
- **DealPME** — Appliquer les autorisations, filigranes et journaux
- **Conseil** — Intervenir dans le périmètre de son mandat
- **Conformité** — Traiter les anomalies et révocations

## Entrées
- NDA exécuté — `PRESENT` — SYNTHETIC_EVIDENCE
- T2 accordé — `PRESENT` — SYNTHETIC_EVIDENCE
- Liste dossiers autorisés — `PRESENT` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Cédant — Demande créée et identifiée — audit `VDR_REQUEST_CREATED`
2. **INPUTS_CHECKED** — Acquéreur — Entrées et habilitations contrôlées — audit `VDR_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — DealPME — Gate métier/compliance évalué — audit `VDR_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Conseil — Décision humaine appliquée lorsqu’elle est requise — audit `VDR_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — VDR_ACTIVE — audit `VDR_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Cédant — Trace exploitable par QA — audit `VDR_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **VDR-C01** — lecture seule par défaut — owner: Cédant — bloquant
- **VDR-C02** — filigrane — owner: Acquéreur — non bloquant
- **VDR-C03** — journal page/document — owner: DealPME — non bloquant

## Décision humaine
- Requise : **non**
- Propriétaire : N/A
- Décision : `SYSTEM_POLICY`
- Preuve : Les droits résultent du dossier d’admission/NDA et des autorisations du cédant.

## Interactions de référence
- `PRIMARY_ACTION` — **Ouvrir la VDR** → `OPEN_VDR` → `VDR_HOME` — audit `VDR_OPEN_VDR`
- `SECONDARY_ACTION` — **Poser une question** → `ASK_QUESTION` → `QUESTION_DRAFT` — audit `VDR_ASK_QUESTION`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer VDR_ACTIVE sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
