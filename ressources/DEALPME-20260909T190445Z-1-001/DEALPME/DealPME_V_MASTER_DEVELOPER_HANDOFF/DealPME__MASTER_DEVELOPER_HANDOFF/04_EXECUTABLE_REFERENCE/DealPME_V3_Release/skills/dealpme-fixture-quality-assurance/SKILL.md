---
name: dealpme-fixture-quality-assurance
description: "Audit DealPME transaction, service and interactive-reference fixtures before they become dev baselines, staging data, demos or regression oracles. Use to validate financial reconciliation, nested disclosure leakage, evidence/provenance, Deal-Ready human gates, VDR access/revocation, permissions, lifecycle, document/risk/Q&R completeness, visible-control registration, dead controls, runtime interaction coverage, service boundaries and future/partner capability claims. Treat confidentiality, authorization bypass, false platform claims and inert visible controls as release blocking."
---

# DealPME Fixture Quality Assurance v3

A fixture passes only when it is safe as a **product oracle**: facts reconcile, restricted data stays restricted, controls behave and failures are testable.

## Workflow
1. Read `references/qa-rules.md`, `references/lifecycle-rules.md`, `references/service-boundaries.md` and `references/interaction-release-gates.md`.
2. Run `scripts/validate_fixture.py fixture.json --output validation.json`.
3. Run `scripts/validate_interactions.py fixture.json --output interaction-validation.json`.
4. For rendered/reference apps, run the UI harness and export `control-coverage.json`, then run `scripts/dead_control_audit.py`.
5. Run mutation regression at least once per major release. Include financial, disclosure, certification, VDR gate, admin access and interaction-registration mutations.
6. Resolve every P0; resolve P1 before formal dev handoff unless a written waiver exists.
7. Re-run from the repaired artifact. Never report a stale PASS.

## Release-blocking P0 examples
- share-deal identity/price/terms leak in T0/T1;
- balance-sheet/P&L reconciliation failure;
- DealPME-owned valuation/fair-value claim;
- automated institutional certification;
- VDR access without the required gate or access after revocation;
- broad default admin visibility or unscoped expert access;
- synthetic fixture presented as live;
- document/risk/Q&R references broken in a golden fixture;
- visible control without a registered interaction contract;
- visible control that produces no deterministic result (`DEAD_CONTROL`);
- sensitive interaction lacking an audit-event contract;
- failure scenario ending in the success state it is meant to block.

## Output
Machine-readable findings with severity, rule ID, path/control, message and repair guidance; plus portfolio summary and mutation evidence when applicable.

## VDR intelligence QA
For an AI-assisted VDR, also run the permission-firewall, AI citation, Clean Team isolation and revocation tests defined by `dealpme-vdr-intelligence-architect`. Treat any leakage as P0.
