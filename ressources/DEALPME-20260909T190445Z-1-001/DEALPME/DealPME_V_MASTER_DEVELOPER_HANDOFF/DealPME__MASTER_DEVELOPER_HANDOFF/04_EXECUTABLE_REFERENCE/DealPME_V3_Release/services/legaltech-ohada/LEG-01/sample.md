# LEG-01 — NDA de transaction

> **SPÉCIMEN SYNTHÉTIQUE — DONNÉES FICTIVES — LegalTech OHADA**

**Archetype :** `NORMAL`  
**Capability :** `GOVERNED_V0`  
**État initial :** `PARTIES_ADMITTED_NDA_REQUIRED`  
**État attendu :** `DRAFT_READY_FOR_REVIEW`

## Objectif de test
Tester la génération d’un NDA versionné, lié au dossier, présenté comme projet à vérifier.

## Déclencheur
Deux parties admises doivent signer avant T2.

## Message utilisateur
Projet de NDA généré ; il doit être revu puis signé selon le mécanisme qualifié ou la procédure papier prévue.

## Acteurs et responsabilités
- **Utilisateur** — Renseigner les variables et vérifier les faits
- **DealPME** — Générer le projet et conserver la version de modèle
- **Conseil qualifié** — Relire et adapter lorsque requis
- **Contrepartie** — Recevoir ou signer après revue appropriée
- **Conformité** — Contrôler les avertissements et le bon régime juridique

## Entrées
- Identités parties — `PRESENT` — SYNTHETIC_EVIDENCE
- Référence deal — `PRESENT` — SYNTHETIC_EVIDENCE
- Variables NDA — `PRESENT` — SYNTHETIC_EVIDENCE

## Parcours
1. **REQUEST_CREATED** — Utilisateur — Demande créée et identifiée — audit `LEG_REQUEST_CREATED`
2. **INPUTS_CHECKED** — DealPME — Entrées et habilitations contrôlées — audit `LEG_INPUTS_CHECKED`
3. **CONTROL_GATE_EVALUATED** — Conseil qualifié — Gate métier/compliance évalué — audit `LEG_CONTROL_GATE_EVALUATED`
4. **HUMAN_GATE_IF_REQUIRED** — Contrepartie — Décision humaine appliquée lorsqu’elle est requise — audit `LEG_HUMAN_GATE_IF_REQUIRED`
5. **OUTPUT_RECORDED** — Conformité — DRAFT_READY_FOR_REVIEW — audit `LEG_OUTPUT_RECORDED`
6. **AUDIT_EVENT_WRITTEN** — Utilisateur — Trace exploitable par QA — audit `LEG_AUDIT_EVENT_WRITTEN`

## Contrôles clés
- **LEG-C01** — version modèle — owner: Utilisateur — bloquant
- **LEG-C02** — avertissement aide rédaction — owner: DealPME — non bloquant
- **LEG-C03** — preuve signature/archivage — owner: Conseil qualifié — non bloquant

## Décision humaine
- Requise : **non**
- Propriétaire : N/A
- Décision : `TEMPLATE_GENERATION`
- Preuve : La génération n’est pas un avis juridique.

## Interactions de référence
- `PRIMARY_ACTION` — **Générer le projet** → `GENERATE_DRAFT` → `DRAFT_GENERATED` — audit `LEG_GENERATE_DRAFT`
- `SECONDARY_ACTION` — **Demander une revue** → `REQUEST_PRO_REVIEW` → `PRO_REVIEW_REQUESTED` — audit `LEG_REQUEST_PRO_REVIEW`
- `TAB_OVERVIEW` — **Situation** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_WORKFLOW` — **Parcours** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_CONTROLS` — **Contrôles & RACI** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_EVIDENCE` — **Preuves & audit** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `TAB_TESTS` — **Tests dev** → `SWITCH_TAB` → `TAB_ACTIVE` — audit `TAB_CHANGED`
- `PROFILE_SWITCH` — **Profil de test** → `SWITCH_TEST_PROFILE` → `PROFILE_CHANGED` — audit `PROFILE_CHANGED`
- `MODAL_CLOSE` — **Fermer** → `CLOSE_MODAL` → `MODAL_CLOSED` — audit `MODAL_CLOSED`

## Assertions négatives
- Forcer DRAFT_READY_FOR_REVIEW sans exécuter CONTROL_GATE_EVALUATED doit échouer.
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
