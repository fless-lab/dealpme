# Evidence and AI model

Every extracted fact preserves:
- document_id
- version_id
- page
- anchor
- extraction_method
- confidence
- review_status

Recommended objects:
- DocumentChunk
- DocumentFact
- DocumentEntity
- DocumentIssue
- DocumentSummary
- DocumentVersionDiff
- EvidenceLink
- AIQuery
- AIAnswer
- AIAnswerCitation
- DiligenceIssue
- DiligenceCoverage
- ReviewState
- EngagementEvent

## DealLens answer contract
```json
{
  "answer": "...",
  "confidence": "HIGH|MEDIUM|INSUFFICIENT",
  "citations": [{"document_id":"DOC-...","version_id":"1.0","page":14,"anchor":"..."}],
  "potential_issues": [],
  "related_documents": [],
  "open_questions": []
}
```

If evidence is insufficient, use: `Les documents auxquels vous avez accès ne permettent pas de conclure.`
