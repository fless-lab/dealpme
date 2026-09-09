---
name: dealpme-vdr-intelligence-architect
description: "Design, generate and validate DealPME's VDR Intelligence Workspace for M&A due diligence. Use when building or upgrading VDR screens, document viewers, DealLens AI, permission-aware retrieval, Clean Team controls, Evidence Map, Issue Radar, diligence coverage, Q&R workflows, version intelligence, engagement analytics, redaction, audit trails or VDR developer references. Enforce DealPME T0/T1/T2 and RPS boundaries, read-only AI, source citations, revocation propagation, no-access leakage prevention and release-blocking interaction tests."
---

# DealPME VDR Intelligence Architect v3.1

Build a **governed diligence intelligence workspace**, not a file browser.

## Workflow
1. Read `references/product-surfaces.md`, `references/permission-firewall.md`, `references/evidence-model.md`, `references/qa-acceptance-tests.md` and `references/benchmark-patterns.md`.
2. Load a validated Pass Transmission fixture and its documents, risks, Q&R, interaction profiles and disclosure state.
3. Generate the VDR surfaces: Cockpit, Documents/Viewer, DealLens IA, Issue Radar, Evidence Map, Q&R Workbench, Engagement Pulse, Audit and Access/Clean Team.
4. Generate per-document intelligence: summary, extracted facts, risks, suggested questions, related documents, evidence links and confidence.
5. Keep DealLens read-only. AI may explain, summarize, compare, extract and draft; it must not publish, submit, certify, change access, edit terms or perform regulated advice.
6. Apply permission filtering **before retrieval**. AI must never reveal the value, title, metadata or existence of an inaccessible document.
7. Require document/version/page/anchor citations for material document-derived claims. If evidence is insufficient, return the explicit insufficiency response.
8. Model Clean Team, expert scope, NDA/T2 gates, download policy and revocation. AI retrieval inherits all of these restrictions.
9. Generate Evidence Map, Diligence Coverage, Financial Tie-Out and Version Intelligence as structured data, not decorative UI.
10. Attach a stable interaction contract to every visible control. Dead controls block release.
11. Run `scripts/validate_vdr_fixture.py`, `scripts/validate_ai_citations.py` and `scripts/validate_permission_firewall.py` before handoff.

## Non-negotiable rules
- Never claim absolute screenshot/capture prevention. Use deterrence, attribution and traceability language.
- Never display unsupported certification claims (SOC, ISO, etc.) in a DealPME reference unless independently approved as a current DealPME claim.
- Never import non-applicable jurisdictional references into the UI.
- Never describe AI extraction or financial reconciliation as an audit opinion, valuation or legal/tax advice.
- Do not let DealLens answer from revoked, hidden or Clean Team documents outside the current user's scope.
- A room-wide query must be constructed from the authorized document set, not from a global retrieval followed by masking.
- Generated redactions remain proposed until a human publishes a redacted derivative; never overwrite the original.
- Engagement Pulse is descriptive unless a validated DealPME predictive model exists.
- French is the source interface language.

## Required outputs
- executable VDR reference or implementation-ready component spec;
- `document-intelligence.json`;
- `diligence-coverage.json`;
- `evidence-map.json`;
- `engagement-pulse.json`;
- `access-matrix.json`;
- `deallens-policy.json`;
- VDR interaction contracts;
- QA results for permission leakage, citation integrity, revocation, Clean Team isolation and dead controls;
- developer implementation guidance when requested.
