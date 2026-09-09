# LEG-02 — LOI avec restrictions de transfert

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — LegalTech OHADA**

**Archetype :** `REMEDIATION`  
**Capability :** `GOVERNED_V0`  
**État initial :** `LOI_VARIABLES_CAPTURED_TRANSFER_RESTRICTIONS`  
**État attendu :** `COUNSEL_REVIEW_REQUIRED`

## Objectif de test
Tester une LOI contenant agrément et préemption qui exige une revue professionnelle.

## Déclencheur
Cession de titres avec agrément statutaire et droit de préemption.

## Message utilisateur
Le projet signale les restrictions de transfert et exige une revue par un conseil qualifié avant usage.

## Acteurs et responsabilités
- **Utilisateur** — Renseigner les variables et vérifier les faits
- **DealPME** — Générer le projet et conserver la version de modèle
- **Conseil qualifié** — Relire et adapter lorsque requis
- **Contrepartie** — Recevoir ou signer après revue appropriée
- **Conformité** — Contrôler les avertissements et le bon régime juridique

## Entrées
- Statuts — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Clause agrément — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Droit préemption — `INCOMPLETE` — SYNTHETIC_EVIDENCE
- Termes LOI — `INCOMPLETE` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Utilisateur — Demande créée et identifiée — audit `LEG_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `LEG_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Conseil qualifié — Gate métier/compliance évalué — audit `LEG_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Contrepartie — Décision humaine appliquée lorsqu’elle est requise — audit `LEG_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — COUNSEL_REVIEW_REQUIRED — audit `LEG_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Utilisateur — Trace exploitable par QA — audit `LEG_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **LEG-C04** — restrictions détectées — owner: Utilisateur — bloquant
- **LEG-C05** — revue pro requise — owner: DealPME — non bloquant
- **LEG-C06** — version counsel enregistrée — owner: Conseil qualifié — non bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : Conseil qualifié / parties
- Décision : `APPROVE_OR_REVISE_DRAFT`
- Preuve : Le conseil adapte le projet au contexte ; DealPME ne conclut pas à sa validité.

## Interactions de référence
- `PRIMARY_ACTION` — **Voir les clauses signalées** → `OPEN_TRANSFER_FLAGS` → `TRANSFER_FLAGS` — audit `LEG_OPEN_TRANSFER_FLAGS`
- `SECONDARY_ACTION` — **Envoyer en revue** → `REQUEST_PRO_REVIEW` → `PRO_REVIEW_REQUESTED` — audit `LEG_REQUEST_PRO_REVIEW`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer COUNSEL_REVIEW_REQUIRED sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
