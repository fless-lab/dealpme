# TAX-02 — Télédéclaration incomplète

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Conformité & Fiscalité**

**Archetype :** `REMEDIATION`  
**Capability :** `PARTNER_DEPENDENT`  
**État initial :** `FILING_DRAFT_MISSING_EVIDENCE`  
**État attendu :** `MISSING_EVIDENCE_REMEDIATION`

## Objectif de test
Tester qu’une pièce fiscale obligatoire manquante empêche la soumission.

## Déclencheur
Pièce fiscale obligatoire manquante dans le dossier.

## Message utilisateur
Télédéclaration non soumise : une pièce obligatoire doit être ajoutée et contrôlée.

## Acteurs et responsabilités
- **Entreprise** — Fournir les données fiscales exactes
- **DealPME** — Orchestrer l’interface et journaliser le statut
- **Partenaire fiscal** — Calculer, déposer ou délivrer selon son habilitation
- **Conseil fiscal** — Interpréter les questions nécessitant un avis
- **Conformité** — Empêcher toute fausse réussite en cas de dépendance indisponible

## Entrées
- Déclaration brouillon — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Pièces présentes — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Pièce manquante — `INCOMPLETE` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Entreprise — Demande créée et identifiée — audit `TAX_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `TAX_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Partenaire fiscal — Gate métier/compliance évalué — audit `TAX_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Conseil fiscal — Décision humaine appliquée lorsqu’elle est requise — audit `TAX_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — MISSING_EVIDENCE_REMEDIATION — audit `TAX_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Entreprise — Trace exploitable par QA — audit `TAX_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **TAX-C04** — validation avant envoi — owner: Entreprise — bloquant
- **TAX-C05** — statut incomplet — owner: DealPME — non bloquant
- **TAX-C06** — pas de faux dépôt — owner: Partenaire fiscal — non bloquant

## Décision humaine
- Requise : **non**
- Propriétaire : N/A
- Décision : `VALIDATION_GATE`
- Preuve : La plateforme bloque avant transmission au partenaire.

## Interactions de référence
- `PRIMARY_ACTION` — **Ajouter la pièce** → `UPLOAD_TAX_EVIDENCE` → `EVIDENCE_RECEIVED` — audit `TAX_UPLOAD_TAX_EVIDENCE`
- `SECONDARY_ACTION` — **Relancer le contrôle** → `REVALIDATE_FILING` → `VALIDATION_PENDING` — audit `TAX_REVALIDATE_FILING`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer MISSING_EVIDENCE_REMEDIATION sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
