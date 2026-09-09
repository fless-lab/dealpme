# DealPME fixture cross-skill contract v3

## Principle
One canonical fixture is the single source of truth. Every downstream skill may project, validate, render or test that fixture; it must never invent a second financial or transaction truth.

## Handoff sequence
1. `dealpme-deal-fixture-architect` creates a schema 3.0 fixture, document corpus, risks, Q&R and interaction contracts, then validates the financial/content truth.
2. `dealpme-disclosure-announcement` projects T0/T1/T2 and builds compliant detailed views from the same canonical fields.
3. `dealpme-interactive-reference-builder` turns the fixture and contracts into executable reference screens with deterministic success, blocked and error states.
4. `dealpme-service-scenario-generator` creates adjacent service scenarios, linked to a case ID where relevant without duplicating its financial truth.
5. `dealpme-fixture-quality-assurance` validates financials, disclosure, permissions, lifecycle, content, interactions and runtime control coverage before dev handoff.

## Canonical controls
- Use `schema_version=3.0` for every newly generated fixture.
- Carry `synthetic=true` and `provenance.not_real_case=true` everywhere in demo/test fixtures.
- Treat financial values as immutable truth once validators pass. Downstream skills may format but never change them.
- Keep confidential share-deal disclosure deny-by-default across UI, exports, alerts, deep links and notifications.
- Keep Deal-Ready certification human and institutional; automation may pre-flight only.
- Scope and expire expert access.
- Model VDR qualification, admission, NDA, T2 grant, seller approval and revocation explicitly.
- Default confidential admin visibility to false; use controlled, time-bounded emergency access only.
- Treat seller asking price as a seller-provided expectation, never a DealPME valuation.
- Label partner-dependent and future capabilities on every output surface where they appear.
- Require an interaction contract for every visible control in reference UIs.
- Treat an inert visible control as `DEAD_CONTROL` and a release blocker.

## Required V3 linkage
A complete Pass Transmission reference set uses stable IDs so the same risk, document, Q&R thread and audit event can be followed across screens. At minimum:
- `risk_id` ↔ `evidence/document_id` ↔ `qa_id` where material;
- `control_id` ↔ interaction contract ↔ audit event;
- lifecycle state ↔ allowed action ↔ blocked result;
- T0/T1/T2 field projection ↔ canonical source path.

## Output language
French is the source language. English is a derived presentation layer only. Never alter a fact, permission, disclosure tier, legal boundary, numerical value or source status during translation.
