# DIA-01 — Acquéreur diaspora qualifié

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Guichet Diaspora**

**Archetype :** `NORMAL`  
**Capability :** `GOVERNED_V0`  
**État initial :** `DIASPORA_PROFILE_VERIFIED`  
**État attendu :** `QUALIFIED_BUYER_ACTIVE`

## Objectif de test
Tester un investisseur diaspora qualifié recevant des opportunités compatibles.

## Déclencheur
Cadre franco-togolais cherche une PME industrielle 2–6 Md FCFA.

## Message utilisateur
Profil qualifié : les opportunités sont filtrées selon la thèse, puis les accès détaillés restent soumis aux gates du dossier.

## Acteurs et responsabilités
- **Investisseur diaspora** — Déclarer sa thèse, son identité et sa capacité
- **DealPME** — Qualifier l’accès, faire correspondre et organiser les rendez-vous
- **Cédant** — Autoriser la divulgation détaillée
- **Banque / conseil** — Traiter change, financement et autorisations
- **Conformité** — Appliquer les contrôles transfrontaliers

## Entrées
- Profil KYC — `PRESENT` — SYNTHETIC_EVIDENCE
- Thèse 2–6 Md FCFA — `PRESENT` — SYNTHETIC_EVIDENCE
- Secteurs — `PRESENT` — SYNTHETIC_EVIDENCE
- preuve capacité — `PRESENT` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Investisseur diaspora — Demande créée et identifiée — audit `DIA_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `DIA_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Cédant — Gate métier/compliance évalué — audit `DIA_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Banque / conseil — Décision humaine appliquée lorsqu’elle est requise — audit `DIA_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — QUALIFIED_BUYER_ACTIVE — audit `DIA_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Investisseur diaspora — Trace exploitable par QA — audit `DIA_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **DIA-C01** — qualification explicable — owner: Investisseur diaspora — bloquant
- **DIA-C02** — accès deal séparé — owner: DealPME — non bloquant
- **DIA-C03** — pas de promesse rendement — owner: Cédant — non bloquant

## Décision humaine
- Requise : **non**
- Propriétaire : N/A
- Décision : `QUALIFICATION_RULES`
- Preuve : La qualification ne vaut ni conseil ni garantie de financement.

## Interactions de référence
- `PRIMARY_ACTION` — **Voir les opportunités** → `OPEN_MATCHES` → `MATCH_LIST` — audit `DIA_OPEN_MATCHES`
- `SECONDARY_ACTION` — **Prendre rendez-vous** → `BOOK_SECURE_APPOINTMENT` → `APPOINTMENT_REQUESTED` — audit `DIA_BOOK_SECURE_APPOINTMENT`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer QUALIFIED_BUYER_ACTIVE sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
