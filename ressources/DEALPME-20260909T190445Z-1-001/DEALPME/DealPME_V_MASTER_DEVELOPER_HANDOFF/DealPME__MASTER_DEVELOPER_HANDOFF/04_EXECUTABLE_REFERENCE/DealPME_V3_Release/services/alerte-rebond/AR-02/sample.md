# AR-02 — Conciliation confidentielle

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Alerte & Rebond**

**Archetype :** `REMEDIATION`  
**Capability :** `GOVERNED_V0`  
**État initial :** `CONCILIATION_DECLARED`  
**État attendu :** `CONFIDENTIALITY_REMEDIATION`

## Objectif de test
Tester la protection renforcée d’un dossier lié à une conciliation formelle.

## Déclencheur
Entreprise déjà engagée dans une conciliation formelle.

## Message utilisateur
Le dossier reste strictement sur invitation ; les habilitations doivent être revues avant tout partage.

## Acteurs et responsabilités
- **Entreprise** — Déclarer la situation et fournir les éléments
- **DealPME** — Orchestrer le diagnostic et les espaces sécurisés
- **Expert restructuration** — Analyser et proposer des scénarios
- **Conformité** — Valider la confidentialité et les admissions
- **Partenaire institutionnel** — Orienter vers les procédures ou acteurs compétents

## Entrées
- Référence conciliation — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Liste invités — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Documents protégés — `INCOMPLETE` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Entreprise — Demande créée et identifiée — audit `AR_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `AR_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Expert restructuration — Gate métier/compliance évalué — audit `AR_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Conformité — Décision humaine appliquée lorsqu’elle est requise — audit `AR_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Partenaire institutionnel — CONFIDENTIALITY_REMEDIATION — audit `AR_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Entreprise — Trace exploitable par QA — audit `AR_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **AR-C04** — invite-only — owner: Entreprise — bloquant
- **AR-C05** — liste nominative — owner: DealPME — non bloquant
- **AR-C06** — kill switch — owner: Expert restructuration — non bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : Conformité + entreprise
- Décision : `CONFIRM_INVITE_LIST`
- Preuve : Aucune visibilité publique et aucune invitation non nominative.

## Interactions de référence
- `PRIMARY_ACTION` — **Revoir les habilitations** → `REVIEW_INVITE_LIST` → `INVITE_LIST_REVIEW` — audit `AR_REVIEW_INVITE_LIST`
- `SECONDARY_ACTION` — **Ajouter un document** → `UPLOAD_CONFIDENTIAL_EVIDENCE` → `EVIDENCE_RECEIVED` — audit `AR_UPLOAD_CONFIDENTIAL_EVIDENCE`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer CONFIDENTIALITY_REMEDIATION sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
