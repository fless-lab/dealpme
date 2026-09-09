---
name: dealpme-deal-fixture-architect
description: "Generate canonical DealPME Pass Transmission fixtures for demos, developer seed data, regression tests and product acceptance. Use when creating or upgrading sample businesses, financial histories, transaction workspaces, risks, VDR document corpora, Q&R threads, disclosure sources or interaction contracts. Produce one synthetic source of truth, preserve DealPME's legal perimeter, label provenance, reconcile financials and make every visible product surface and controlled action derivable from the fixture before handoff."
---

# DealPME Deal Fixture Architect v3

Create a **test oracle**, not a brochure. One canonical fixture must drive every screen, document, interaction and QA assertion.

## Workflow
1. Read `references/fixture-schema.md`, `references/interaction-contract-schema.md`, `references/content-completeness.md` and `references/financial-consistency.md`.
2. Choose a deliberate transaction archetype and QA purpose.
3. Create `schema_version: "3.0"`, `synthetic: true`, stable `case_id`, deterministic seed, `as_of_date`, source locale and XOF scale.
4. Build five consecutive income-statement years plus three balance-sheet and cash-flow years. Derive KPIs from the statements.
5. Add the transaction workspace, evidence ledger, Deal-Ready scope, access profiles and lifecycle.
6. Add **structured risks**, each linked to evidence and at least one diligence question where material.
7. Add a **synthetic VDR corpus** with folder, document metadata, access, watermark/download policy and explicit fake-document labelling.
8. Add Q&R threads linked to documents and risks.
9. Add the interaction contract for every visible control required by the reference UI.
10. Populate disclosure source data for T0/T1/T2 without copying restricted values into lower tiers.
11. Run `scripts/validate_financials.py` and `scripts/validate_fixture_content.py`. Resolve every P0/P1 before return.

## Non-negotiable rules
- Never create a fixture that can be mistaken for a live mandate. Human and machine outputs must say synthetic/fictitious.
- For a `SHARE_DEAL`, keep identity, RCCM, asking price, valuation, offer terms, T2/VDR links and direct confidential-document references out of T0/T1.
- `master.asking` is the seller's expectation. Never call it a DealPME valuation, fair value or recommendation.
- Deal-Ready automation may pre-screen only. Certification requires a named human institutional decision and a limited scope statement.
- VDR access is default-deny. Model qualification, admission, NDA, T2 grant, seller approval and revocation states explicitly.
- Administrative confidential access must not be broad by default; expert access must be scoped and expiring.
- Money is canonical XOF with a declared scale. Do not use floating-point currency amounts as truth.
- French is the source UI language. Use native professional French and preserve RCCM/SYSCOHADA/OHADA terms.
- Do not state that DealPME gives legal, tax, accounting, regulatory or investment advice, guarantees a transaction, or holds transaction consideration in governed v0.

## Required output directory
- `sample.md`
- `fixture.json`
- `validation-financials.json`
- `validation-content.json`
- `interaction-contract.json`
- `risks.json`
- `q-and-a.json`
- `documents.json`
- `documents/` containing synthetic test documents when a full dev fixture is requested

The dossier must explain the test purpose, business, financials, transaction, evidence quality, readiness scope, risks, VDR, Q&R, disclosure, access states, lifecycle and developer assertions.

## VDR intelligence handoff
When a fixture requires an advanced VDR, produce the canonical document/risk/Q&R inputs and hand VDR intelligence, DealLens, Evidence Map and Clean Team design to `dealpme-vdr-intelligence-architect`.
