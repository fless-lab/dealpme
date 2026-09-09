# EX-01 — Quality of Earnings urgent

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Deal-Experts**

**Archetype :** `NORMAL`  
**Capability :** `FUTURE_TARGET`  
**État initial :** `RFP_DRAFTED`  
**État attendu :** `EXPERT_MANDATE_ACTIVE`

## Objectif de test
Tester une mission QoE urgente avec expert indépendant et accès limité.

## Déclencheur
Le repreneur demande une revue QoE sous 10 jours avant LOI finale.

## Message utilisateur
La mission peut démarrer après acceptation de l’offre et ouverture des seuls dossiers VDR nécessaires.

## Acteurs et responsabilités
- **Utilisateur** — Définir le besoin et contracter la mission
- **DealPME** — Orchestrer la demande et les accès techniques
- **Expert** — Exécuter la mission de façon indépendante
- **Conformité** — Vérifier conflit, habilitation et périmètre
- **Cédant** — Autoriser les accès aux pièces de son dossier

## Entrées
- Micro-RFP QoE — `PRESENT` — SYNTHETIC_EVIDENCE
- Délai 10 jours — `PRESENT` — SYNTHETIC_EVIDENCE
- Dossiers FIN/COM ciblés — `PRESENT` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Utilisateur — Demande créée et identifiée — audit `EX_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `EX_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Expert — Gate métier/compliance évalué — audit `EX_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Conformité — Décision humaine appliquée lorsqu’elle est requise — audit `EX_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Cédant — EXPERT_MANDATE_ACTIVE — audit `EX_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Utilisateur — Trace exploitable par QA — audit `EX_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **EX-C01** — expert vérifié — owner: Utilisateur — bloquant
- **EX-C02** — accès limité aux dossiers autorisés — owner: DealPME — non bloquant
- **EX-C03** — expiration à remise du rapport — owner: Expert — non bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : Utilisateur / client
- Décision : `ACCEPT_EXPERT_PROPOSAL`
- Preuve : Le contrat de mission reste conclu avec l’expert ; DealPME n’instruit pas le fond.

## Interactions de référence
- `PRIMARY_ACTION` — **Accepter la proposition** → `ACCEPT_PROPOSAL` → `MANDATE_ACTIVE` — audit `EX_ACCEPT_PROPOSAL`
- `SECONDARY_ACTION` — **Ouvrir le périmètre d’accès** → `OPEN_EXPERT_SCOPE` → `SCOPE_VIEW` — audit `EX_OPEN_EXPERT_SCOPE`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer EXPERT_MANDATE_ACTIVE sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
