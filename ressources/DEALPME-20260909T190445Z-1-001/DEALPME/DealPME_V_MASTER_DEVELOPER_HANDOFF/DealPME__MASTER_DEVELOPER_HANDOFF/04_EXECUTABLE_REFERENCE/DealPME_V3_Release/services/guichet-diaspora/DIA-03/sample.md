# DIA-03 — Due diligence 100 % à distance

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Guichet Diaspora**

**Archetype :** `REMEDIATION`  
**Capability :** `GOVERNED_V0`  
**État initial :** `REMOTE_DD_STARTED`  
**État attendu :** `REMOTE_DD_REMEDIATION`

## Objectif de test
Tester une diligence 100 % à distance avec pièces manquantes et vérifications ciblées.

## Déclencheur
Family office diaspora analyse une cible sans déplacement initial.

## Message utilisateur
Diligence à distance en cours : deux pièces doivent être fournies avant la prochaine étape.

## Acteurs et responsabilités
- **Investisseur diaspora** — Déclarer sa thèse, son identité et sa capacité
- **DealPME** — Qualifier l’accès, faire correspondre et organiser les rendez-vous
- **Cédant** — Autoriser la divulgation détaillée
- **Banque / conseil** — Traiter change, financement et autorisations
- **Conformité** — Appliquer les contrôles transfrontaliers

## Entrées
- NDA/T2 — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Checklist DD distante — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Pièces manquantes — `INCOMPLETE` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Investisseur diaspora — Demande créée et identifiée — audit `DIA_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `DIA_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Cédant — Gate métier/compliance évalué — audit `DIA_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Banque / conseil — Décision humaine appliquée lorsqu’elle est requise — audit `DIA_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — REMOTE_DD_REMEDIATION — audit `DIA_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Investisseur diaspora — Trace exploitable par QA — audit `DIA_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **DIA-C04** — contrôle accès — owner: Investisseur diaspora — bloquant
- **DIA-C05** — rendez-vous sécurisé — owner: DealPME — non bloquant
- **DIA-C06** — provenance pièces — owner: Cédant — non bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : Cédant / DealPME selon accès
- Décision : `GRANT_MISSING_EVIDENCE_ACCESS`
- Preuve : La mise à disposition de nouvelles pièces reste contrôlée.

## Interactions de référence
- `PRIMARY_ACTION` — **Voir les pièces manquantes** → `OPEN_MISSING_DOCS` → `MISSING_DOCS` — audit `DIA_OPEN_MISSING_DOCS`
- `SECONDARY_ACTION` — **Demander un échange vidéo** → `REQUEST_VIDEO_MEETING` → `MEETING_REQUESTED` — audit `DIA_REQUEST_VIDEO_MEETING`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer REMOTE_DD_REMEDIATION sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
