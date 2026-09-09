# LEG-03 — Contrat de travail

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — LegalTech OHADA**

**Archetype :** `CONTROL_FAILURE`  
**Capability :** `GOVERNED_V0`  
**État initial :** `EMPLOYMENT_TEMPLATE_REQUESTED_AS_OHADA`  
**État attendu :** `BLOCKED_NATIONAL_LAW_REVIEW`

## Objectif de test
Prouver qu’un contrat de travail ne peut être présenté comme régi par un Acte uniforme OHADA.

## Déclencheur
Le cédant veut régulariser un cadre clé avant audit.

## Message utilisateur
Génération bloquée sous le libellé demandé : le contrat de travail relève du droit togolais et des conventions applicables.

## Acteurs et responsabilités
- **Utilisateur** — Renseigner les variables et vérifier les faits
- **DealPME** — Générer le projet et conserver la version de modèle
- **Conseil qualifié** — Relire et adapter lorsque requis
- **Contrepartie** — Recevoir ou signer après revue appropriée
- **Conformité** — Contrôler les avertissements et le bon régime juridique

## Entrées
- Données salarié — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Convention collective applicable — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE
- Droit togolais — `REVIEW_REQUIRED` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Utilisateur — Demande créée et identifiée — audit `LEG_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `LEG_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Conseil qualifié — Gate métier/compliance évalué — audit `LEG_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Contrepartie — Décision humaine appliquée lorsqu’elle est requise — audit `LEG_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — BLOCKED_NATIONAL_LAW_REVIEW — audit `LEG_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Utilisateur — Trace exploitable par QA — audit `LEG_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **LEG-C07** — aucun libellé OHADA erroné — owner: Utilisateur — bloquant
- **LEG-C08** — droit national affiché — owner: DealPME — bloquant
- **LEG-C09** — revue pro — owner: Conseil qualifié — bloquant

## Décision humaine
- Requise : **oui**
- Propriétaire : Conformité / conseil
- Décision : `CORRECT_LEGAL_BASIS`
- Preuve : Le modèle peut être généré seulement avec la base nationale correcte et l’avertissement professionnel.

## Interactions de référence
- `PRIMARY_ACTION` — **Corriger le régime juridique** → `CORRECT_LEGAL_BASIS` → `LEGAL_BASIS_CORRECTED` — audit `LEG_CORRECT_LEGAL_BASIS`
- `SECONDARY_ACTION` — **Demander une revue** → `REQUEST_PRO_REVIEW` → `PRO_REVIEW_REQUESTED` — audit `LEG_REQUEST_PRO_REVIEW`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer BLOCKED_NATIONAL_LAW_REVIEW sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
