# TAX-03 — API partenaire indisponible

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — Conformité & Fiscalité**

**Archetype :** `CONTROL_FAILURE`  
**Capability :** `PARTNER_DEPENDENT`  
**État initial :** `PARTNER_REQUEST_IN_PROGRESS`  
**État attendu :** `UPSTREAM_UNAVAILABLE_HOLD`

## Objectif de test
Prouver qu’une indisponibilité du partenaire ne produit ni dépôt ni certificat fictif.

## Déclencheur
Le certificat fiscal ne peut être récupéré automatiquement.

## Message utilisateur
Service partenaire indisponible. La demande est conservée et pourra être relancée ; aucun certificat n’a été émis.

## Acteurs et responsabilités
- **Entreprise** — Fournir les données fiscales exactes
- **DealPME** — Orchestrer l’interface et journaliser le statut
- **Partenaire fiscal** — Calculer, déposer ou délivrer selon son habilitation
- **Conseil fiscal** — Interpréter les questions nécessitant un avis
- **Conformité** — Empêcher toute fausse réussite en cas de dépendance indisponible

## Entrées
- Requête partenaire — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Correlation ID — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Dernier statut connu — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Entreprise — Demande créée et identifiée — audit `TAX_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `TAX_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Partenaire fiscal — Gate métier/compliance évalué — audit `TAX_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Conseil fiscal — Décision humaine appliquée lorsqu’elle est requise — audit `TAX_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — UPSTREAM_UNAVAILABLE_HOLD — audit `TAX_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Entreprise — Trace exploitable par QA — audit `TAX_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **TAX-C07** — erreur UPSTREAM_UNAVAILABLE — owner: Entreprise — bloquant
- **TAX-C08** — aucun certificat synthétique — owner: DealPME — bloquant
- **TAX-C09** — retry idempotent — owner: Partenaire fiscal — bloquant

## Décision humaine
- Requise : **non**
- Propriétaire : N/A
- Décision : `UPSTREAM_FAILURE`
- Preuve : Aucun état SUCCESS/FILED/CERTIFICATE_ISSUED ne peut être atteint.

## Interactions de référence
- `PRIMARY_ACTION` — **Réessayer** → `RETRY_PROVIDER` → `RETRY_SCHEDULED` — audit `TAX_RETRY_PROVIDER`
- `SECONDARY_ACTION` — **Voir le statut** → `OPEN_PROVIDER_STATUS` → `PROVIDER_STATUS` — audit `TAX_OPEN_PROVIDER_STATUS`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer UPSTREAM_UNAVAILABLE_HOLD sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
