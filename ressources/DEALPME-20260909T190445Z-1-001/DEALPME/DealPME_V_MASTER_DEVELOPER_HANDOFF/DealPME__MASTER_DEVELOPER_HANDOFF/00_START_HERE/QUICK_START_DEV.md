# Quick Start for the DealPME Development Team

## 1. Treat this package as the reference contract
Implement from the current product baseline and interaction contracts. Do not infer missing permissions, disclosure behavior, monetary logic or regulatory behavior. Raise a specification question instead.

## 2. First implementation target
Use `04_EXECUTABLE_REFERENCE/DealPME_V3_Release/pass-transmission/PT-001/` as the gold implementation. The ordinary transaction app and the redesigned VDR Intelligence workspace must both work.

## 3. Required VDR behavior
Implement authentication/qualification/admission/NDA/T2/revocation gates before protected content retrieval. Apply the same permission firewall before any DealLens AI retrieval.

## 4. Fixture-first implementation
Every UI surface should consume the corresponding fixture rather than hard-coded screen text. Use the interaction contract to determine action, gate, result state, blocked state and audit event.

## 5. Regression variants
After PT-001 passes, run PT-002 through PT-012. These cases exercise asset vs share transactions, sector/regulatory variation, cross-border/diaspora patterns, succession, capital intensity and distress.

## 6. Service implementation
Use the 24 service scenarios. Each service family deliberately includes a normal path, a remediation path and a control/failure path.

## 7. Acceptance
A feature is not done because it renders. It is done only when data, interaction, permission, blocked states, audit events, negative tests, native French and release gates all pass.

See `../03_DEVELOPER_GUIDES/04_RELEASE_GATE.md` for the canonical gate.
