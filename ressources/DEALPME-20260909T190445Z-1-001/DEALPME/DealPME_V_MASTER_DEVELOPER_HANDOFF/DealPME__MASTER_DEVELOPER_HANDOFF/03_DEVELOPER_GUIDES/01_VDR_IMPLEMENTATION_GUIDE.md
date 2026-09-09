# DealPME VDR Intelligence Workspace — Guide d’implémentation développeur

**Version : 3.1 VDR Intelligence Upgrade**  
**Date de référence : 06/09/2026**  
**Statut : spécification d’implémentation et de QA**

## 1. Décision produit

La VDR DealPME doit être implémentée comme un **espace d’intelligence de due diligence gouverné**, et non comme un simple gestionnaire de fichiers. L’unité de travail n’est pas seulement le document : c’est la chaîne **document → fait → preuve → risque → Q&R → décision**.

Les données de démonstration de ce package sont synthétiques. Elles servent de fixtures et ne doivent jamais être présentées comme des transactions réelles.

## 2. Principes non négociables

1. **Permission avant retrieval IA.** Le filtrage d’accès s’effectue avant qu’un chunk, une page, un titre ou un métadonnée confidentielle ne soit transmis au moteur IA.
2. **L’IA ne sait jamais plus que l’utilisateur.** Aucun indice sur l’existence d’un document inaccessible.
3. **Lecture seule par défaut.** DealLens explique, résume, extrait, compare et propose. Il ne publie pas, ne modifie pas les permissions, ne répond pas au vendeur et ne certifie jamais.
4. **Citation obligatoire.** Toute affirmation matérielle issue d’un document doit conserver document, version, page et ancre.
5. **Réponse d’insuffisance.** En absence de preuve suffisante : « Les documents auxquels vous avez accès ne permettent pas de conclure. »
6. **Révocation transitive.** Une révocation VDR invalide aussi immédiatement la récupération IA issue du document.
7. **Clean Team isolée.** L’IA d’un utilisateur standard ne peut jamais utiliser les chunks Clean Team.
8. **Protection honnête.** Filigrane, restriction de téléchargement et journalisation visent dissuasion, attribution et recours ; ils ne promettent pas l’impossibilité absolue de capture.
9. **Toutes les commandes visibles ont un contrat d’interaction.** Un contrôle mort bloque la release.
10. **Français source.** Les libellés FR sont rédigés nativement ; EN est une version dérivée.

## 3. Surfaces produit

### 3.1 Cockpit
Afficher : progression, couverture par domaine, points ouverts, Q&R, derniers documents, priorités de revue. La couverture est un indicateur de complétude, jamais une opinion d’audit.

### 3.2 Documents
Trois zones sur desktop : index diligence, document list/viewer, rail DealLens. La sélection d’un document doit synchroniser métadonnées, AI context, risques, Q&R, versions et Evidence Map.

### 3.3 DealLens IA
Deux modes : **document-scoped** et **room-scoped**. Chaque réponse doit exposer : réponse, preuves, niveau de confiance, limites, risques potentiels, documents liés et question ouverte.

### 3.4 Issue Radar
Registre structuré : `severity`, `probability`, `status`, `source`, `owner`, `impact`, `evidence`, `qa_links`, `mitigation`. Impacts : prix, SPA/garanties, condition suspensive, financement, intégration, information seulement.

### 3.5 Evidence Map
Graphe d’objets reliés : Document, Fact, Metric, Risk, Q&A, ContractTerm, DealReadyGap, ManagementResponse. Chaque arête porte une relation explicite (`SUPPORTS`, `CONTRADICTS`, `RAISES`, `RESOLVES`, `EVIDENCES`).

### 3.6 Q&R Workbench
Rôles : Question Author, Question Coordinator, Answer Coordinator, Expert, Approver. DealLens peut rédiger un brouillon à partir d’un passage mais la soumission reste humaine.

### 3.7 Engagement Pulse
Indicateur descriptif : connexions, couverture de lecture, vélocité de consultation, Q&R, activité senior. Ne pas l’appeler « probabilité de closing » tant qu’un modèle n’est pas validé sur l’historique DealPME.

### 3.8 Audit
Journal append-only pour actions sensibles. Ne jamais journaliser le corps du document, un document d’identité ou une réponse IA complète contenant des données confidentielles ; journaliser les identifiants, action, résultat et corrélation.

### 3.9 Accès & Clean Team
Groupes, permissions par dossier/document, expiration, justification, téléchargement, IA permise ou non. Un expert est limité par mandat, périmètre et échéance.

## 4. Ingestion documentaire

`Upload → malware scan → classification → OCR/text extraction → page anchors → metadata extraction → version fingerprint → permission-aware indexing → AI enrichment → publication`

### États proposés
`UPLOADED`, `SCANNING`, `PROCESSING`, `REVIEW_REQUIRED`, `PUBLISHED`, `SUPERSEDED`, `REVOKED`, `QUARANTINED`.

## 5. Données et schémas

### `Document`
`id, deal_id, folder_id, title, type, version, status, tier, clean_team, source_owner, created_at, published_at, download_policy, watermark_policy, classification, current_hash`

### `DocumentChunk`
`id, document_id, version_id, page, anchor, text, embedding_ref, classification, permission_scope_hash`

### `DocumentFact`
`id, document_id, version_id, page, anchor, fact_type, label, normalized_value, currency, extraction_method, confidence, review_status`

### `DiligenceIssue`
`id, deal_id, category, title, description, severity, probability, status, owner, impact_type, source_type, created_by, due_at`

### `EvidenceLink`
`from_type, from_id, to_type, to_id, relation, source_document_id, source_page, source_anchor, confidence`

### `AIQuery / AIAnswer`
Conserver le profil d’autorisation utilisé, le hash du set documentaire accessible, les citations, le modèle/policy version, l’horodatage, le statut de revue et non le contenu confidentiel dans des logs techniques non chiffrés.

## 6. Disclosure Firewall / récupération IA

Pseudo-flux :

1. Authentifier l’utilisateur.
2. Résoudre le deal et l’état T0/T1/T2.
3. Vérifier admission RPS et NDA lorsque requis.
4. Résoudre groupe, dossier, document, Clean Team et mandat expert.
5. Construire le set documentaire autorisé.
6. Interroger uniquement l’index filtré par ce set.
7. Vérifier toutes les citations contre le set autorisé.
8. Générer la réponse.
9. Rejeter ou neutraliser toute citation non autorisée.
10. Journaliser `AI_QUERY_COMPLETED` sans enregistrer le contenu sensible en clair.

**Interdit :** récupérer globalement puis masquer après génération.

## 7. DealLens — contrat de réponse

```json
{
  "answer": "...",
  "confidence": "HIGH|MEDIUM|INSUFFICIENT",
  "citations": [{"document_id":"...","version_id":"...","page":14,"anchor":"..."}],
  "potential_issues": ["..."],
  "related_documents": ["..."],
  "open_questions": ["..."]
}
```

Chaque citation doit ouvrir la page exacte du viewer. Une réponse sans citations est limitée à de l’aide d’usage de la plateforme, pas à une conclusion sur le contenu du deal.

## 8. Financial Tie-Out

Créer une couche de rapprochement entre : comptes annuels, management accounts, balance âgée, dettes, déclarations fiscales, éléments de la fiche Pass Transmission. Tout écart est un **point de rapprochement** et non une opinion d’audit.

Sortie : valeur A, valeur B, différence, matérialité paramétrable, source A/B, statut, commentaire humain.

## 9. Version Intelligence

Pour chaque nouvelle version : hash, diff textuel, diff sémantique, changements matériels proposés, liens vers risques/Q&R. L’IA suggère la matérialité ; un humain confirme les changements utilisés dans le dossier de décision.

## 10. Caviardage assisté IA

Flux : détecter → proposer → revue humaine élément par élément → preview → publier version caviardée. Types : PII, salaires, coordonnées bancaires, identités clients sensibles, prix commerciaux, identifiants administratifs. Ne jamais écraser l’original.

## 11. API de référence

- `GET /v1/deals/:dealId/vdr/folders`
- `GET /v1/deals/:dealId/vdr/documents?folder=`
- `GET /v1/deals/:dealId/vdr/documents/:documentId`
- `POST /v1/deals/:dealId/vdr/documents/:documentId/view-token`
- `POST /v1/deals/:dealId/deallens/query`
- `GET /v1/deals/:dealId/deallens/answers/:answerId`
- `GET /v1/deals/:dealId/issues`
- `POST /v1/deals/:dealId/issues`
- `GET /v1/deals/:dealId/evidence-map`
- `GET /v1/deals/:dealId/qa`
- `POST /v1/deals/:dealId/qa/drafts`
- `POST /v1/deals/:dealId/qa/:qaId/submit`
- `GET /v1/deals/:dealId/engagement`
- `GET /v1/deals/:dealId/audit`
- `GET /v1/deals/:dealId/access`

Toutes les autorisations sont serveur. Pour les ressources restreintes, retourner `NOT_FOUND` lorsque confirmer l’existence constitue déjà une fuite.

## 12. Événements d’audit minimums

`VDR_OPENED, DOCUMENT_VIEWED, DOCUMENT_DOWNLOAD_ATTEMPT, DOCUMENT_ACCESS_REVOKED, DEAL_LENS_QUERY, DEAL_LENS_CITATION_OPENED, QA_DRAFTED, QA_SUBMITTED, ISSUE_CREATED, ISSUE_STATUS_CHANGED, PERMISSION_CHANGED, CLEAN_TEAM_GRANTED, CLEAN_TEAM_REVOKED, REDACTION_PUBLISHED, VERSION_PUBLISHED`.

## 13. Acceptance tests P0

### AI-01 — fuite permission
**Given** A ne peut pas voir DOC-X. **When** A demande une information présente seulement dans DOC-X. **Then** aucune réponse ne révèle la valeur, le titre, l’existence ou une citation de DOC-X.

### AI-02 — Clean Team
**Given** un document Clean Team. **When** un utilisateur standard lance une recherche room-wide. **Then** le document ne participe pas au retrieval.

### AI-03 — citation
**Given** une réponse factuelle. **Then** chaque fait matériel possède au moins une citation résoluble vers une page autorisée.

### AI-04 — absence de preuve
**Given** aucune source suffisante. **Then** réponse `INSUFFICIENT` et aucun complément spéculatif.

### AI-05 — révocation
**Given** un document précédemment accessible. **When** accès révoqué. **Then** viewer et retrieval IA échouent immédiatement ; token de consultation invalide selon le SLA VDR.

### AI-06 — lecture seule
**When** DealLens rédige une Q&R. **Then** la sortie reste `DRAFT`; aucune soumission sans action humaine explicite.

### DOC-01 — téléchargement
Téléchargement désactivé par défaut et test négatif pour document non autorisé.

### DOC-02 — watermark
Chaque page rendue porte identité du viewer, account id, timestamp et deal ref lorsque requis.

### DOC-03 — version
Une version remplacée reste auditée ; la nouvelle version ne réutilise pas silencieusement l’ancienne analyse IA.

### Q&A-01 — workflow
Un auteur sans rôle coordinateur peut préparer un brouillon mais ne peut pas contourner le gatekeeper configuré.

### UI-01 — dead control
Tout bouton, onglet, filtre ou CTA visible a un interaction contract et un test de résultat. Sinon : `FAIL / RELEASE BLOCKER`.

## 14. Performance et mobile

- Viewer : chargement progressif page par page.
- Index : pagination ou virtualisation au-delà de 300 lignes.
- Recherche : réponse initiale < 1,5 s cible hors génération IA.
- DealLens : streaming de réponse ; afficher les citations dès qu’elles sont validées.
- Mobile : document + DealLens + Q&R prioritaires ; index et telemetry en drawers.
- Respecter `prefers-reduced-motion`.

## 15. Sécurité et confidentialité

- URLs de fichiers non publiques et courtes durées de vie.
- Chiffrement transit/at-rest + chiffrement applicatif des champs `CONFIDENTIAL_DEAL` selon architecture retenue.
- MFA / step-up pour Clean Team et changements de permission.
- Aucun fichier ou texte de VDR envoyé à un outil IA grand public hors du modèle fournisseur contractuellement autorisé.
- Feature flag pour toute capacité IA nouvelle ; audit de chaque changement de policy.

## 16. Benchmark public utilisé

Les fonctionnalités ci-dessous ont été étudiées comme **patterns**, sans transformer les claims des fournisseurs en exigences DealPME :

- Datasite Diligence : recherche sémantique, résumés, explications, comparaison/extraction multi-documents, redaction AI, Q&A assistée et permission-aware AI. https://www.datasite.com/fr/fr/products/diligence
- Intralinks DealCentre AI / Ask Link : réponses avec références sources, restriction aux documents autorisés, mode document-scoped, import de questions, Q&A déléguée. https://support.intralinks.com/hc/en-us/articles/30966076017051-Using-AI-to-answer-questions-about-documents-DealCentre-AI
- iDeals : caviardage assisté par IA et permissions de gestion. https://helpcenter.idealsvdr.com/en/articles/7733393-document-redaction
- Ansarada : Bidder Engagement Score et gouvernance IA. https://help.ansarada.com/en/articles/2588132-bidder-engagement-score ; https://www.ansarada.com/data-room/ai-data-governance
- Firmex : Q&A avec Question Coordinator, Answer Coordinator, Expert et Approver ; questions liées aux documents. https://support.firmex.com/hc/en-us/articles/204467698-Questions-and-Answers-Q-A

## 17. Fichiers de référence du package

- `pass-transmission/PT-001/vdr-intelligence/standalone.html` — gold executable reference.
- `pass-transmission/PT-001/data/document-intelligence.json` — intelligence par document.
- `pass-transmission/PT-001/data/evidence-map.json` — Evidence Map.
- `pass-transmission/PT-001/data/diligence-coverage.json` — coverage.
- `pass-transmission/PT-001/data/engagement-pulse.json` — Engagement Pulse.
- `pass-transmission/PT-001/data/access-matrix.json` — Clean Team / access fixtures.
- `vdr-intelligence/design-concepts/` — concept references.
- `governance/GLOBAL_INTERACTION_REGISTRY.*` — contrats visibles.

## 18. Definition of Done VDR Intelligence

Le module n’est `DONE` que si :

**documents complets + permissions serveur + viewer protégé + Q&R routée + DealLens permission-aware + citations vérifiables + Evidence Map + Issue Radar + Clean Team + audit + mobile + tests négatifs + zéro contrôle mort.**
