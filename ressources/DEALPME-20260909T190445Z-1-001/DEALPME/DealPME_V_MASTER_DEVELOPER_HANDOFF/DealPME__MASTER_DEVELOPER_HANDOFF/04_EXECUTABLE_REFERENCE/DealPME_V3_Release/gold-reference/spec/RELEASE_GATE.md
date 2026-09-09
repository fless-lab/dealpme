# DealPME — Release Gate v3

## Statuts

- **PASS** : aucun P0/P1 ouvert.
- **PASS_WITH_WARNINGS** : aucun P0, uniquement dette documentaire/polish approuvée.
- **FAIL** : au moins un P0.

## P0 — bloque la release

1. `DEAD_CONTROL` — contrôle visible sans interaction contractuelle ou sans réaction vérifiable.
2. `UNREGISTERED_CONTROL` — `data-control-id` absent du registre.
3. `DISCLOSURE_LEAK` — identité/prix/termes/document T2 dans T0/T1 d’un share deal.
4. `VDR_GATE_BYPASS` — accès VDR sans qualification/admission/NDA/T2/autorisation requise.
5. `REVOKED_ACCESS_ALLOWED` — utilisateur révoqué qui conserve l’accès.
6. `FINANCIAL_RECONCILIATION_FAIL` — états financiers incohérents.
7. `FALSE_DEALPME_VALUATION` — attente du cédant présentée comme opinion DealPME.
8. `AUTO_CERTIFICATION` — certification institutionnelle sans décision humaine nommée.
9. `MISSING_AUDIT_EVENT` — action sensible sans événement attendu.
10. `LIVE_LOOKING_SYNTHETIC_FIXTURE` — fixture fictif susceptible d’être pris pour une vraie opération.

## Scénarios d’accès obligatoires

- GUEST → LOGIN_REQUIRED
- VERIFIED_BUYER → QUALIFICATION_REQUIRED
- QUALIFIED → ADMISSION_REQUIRED
- ADMITTED → NDA_REQUIRED
- NDA_SIGNED → T2_GRANT_REQUIRED
- AUTHORIZED → VDR_HOME
- REVOKED → ACCESS_REVOKED

## Contrôles fonctionnels obligatoires PT-001

- 6 onglets principaux ;
- Favoris ;
- Contact cédant ;
- Manifestation d’intérêt ;
- Demande de réunion ;
- Recherche et filtre Documents ;
- Ouverture d’un document ;
- Q&R et création de question ;
- Ouverture VDR ;
- navigation dossiers VDR ;
- sélection document VDR ;
- téléchargement bloqué par défaut ;
- retour VDR ;
- fermetures modales ;
- contrôles hors périmètre répondant par un état explicite.

## Preuves de release

La release doit produire :

- `qa/e2e-results.json`
- `qa/control-coverage.json`
- captures desktop et mobile
- `qa/fidelity-ledger.md`
- validation fixture / divulgation / interactions
