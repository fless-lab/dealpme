---
name: dealpme-interactive-reference-builder
description: "Build executable DealPME product-reference applications from canonical fixtures and interaction contracts. Use when a dev team needs a gold-standard Pass Transmission or service sample in which every tab, CTA, document row, VDR gate, Q&R action and failure state is populated and testable. Produce a deterministic reference UI, interaction registry, state matrix, synthetic VDR/document corpus integration, visual screenshots and runtime acceptance evidence; reject dead controls and unspecified developer choices."
---

# DealPME Interactive Reference Builder

Turn approved fixture data into an **executable product specification**. The reference app is not a mockup: dev teams use it to know exactly what should appear, happen, be blocked and be audited.

## Workflow
1. Read `references/reference-app-contract.md`, `references/component-model.md`, `references/e2e-test-matrix.md` and `references/visual-fidelity.md`.
2. Load a validated canonical fixture and its `interaction-contract.json`.
3. Build the authorized detailed surface with populated `Aperçu`, `Données financières`, `Transaction`, `Risques`, `Documents`, `Q&R` and VDR.
4. Implement access-state simulation for guest, verified/unqualified, qualified, admitted, NDA signed, authorized and revoked.
5. Give every visible control a stable control ID. A control not in the registry may not ship.
6. Implement deterministic success, blocked and error results for each action. Do not use fake disabled UI where the target behavior is known.
7. Connect risks to evidence, Q&R to documents and VDR documents to usable synthetic content.
8. Build a dev-only state controller that is absent from the production view but available in the test reference.
9. Run runtime tests from `references/e2e-test-matrix.md`. Export screenshots and a control-coverage artifact.
10. Run `scripts/validate_reference_manifest.py` and `scripts/validate_control_coverage.py` before handoff.

## Product rules
- No visible control without an interaction contract.
- No visible tab without meaningful content.
- No gate implemented only in the frontend in the production target; the reference simulator shows the expected result, while implementation notes require server-side authorization.
- Share-deal T0/T1 restrictions remain binding across UI, exports, alerts and navigation.
- VDR download is off by default; show honest protection language and revocation behavior.
- Synthetic documents and companies must be visibly fictitious.
- Preserve native French and DealPME visual hierarchy. Do not invent trust metrics, legal conclusions or DealPME valuation claims.

## Required handoff
- runnable reference app or standalone HTML;
- source files;
- canonical fixture and synthetic documents;
- `UI_INTERACTION_REGISTRY.md`;
- `ACCESS_STATE_MATRIX.md`;
- `DEVELOPER_IMPLEMENTATION_STANDARD.md`;
- `RELEASE_GATE.md`;
- E2E/runtime results;
- desktop and mobile screenshots;
- fidelity ledger.

## Advanced VDR surface
Use `dealpme-vdr-intelligence-architect` as the authority for VDR screens, DealLens, Evidence Map, Issue Radar, engagement analytics, access and AI safety. The reference builder owns executable integration and interaction fidelity.
