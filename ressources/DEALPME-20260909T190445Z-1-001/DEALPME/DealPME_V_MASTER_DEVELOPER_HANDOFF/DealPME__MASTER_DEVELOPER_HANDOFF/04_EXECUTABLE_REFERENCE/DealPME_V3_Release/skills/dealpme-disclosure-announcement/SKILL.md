---
name: dealpme-disclosure-announcement
description: "Project canonical DealPME fixtures into compliant T0/T1/T2 data and complete interactive listing references. Use for cards, anonymized teasers, authorized buyer views, financial/transaction/risk/document/Q&R tabs, VDR entry, website implementation specs and disclosure regression tests. Preserve one financial truth, enforce recursive leakage checks and non-indexability, attach interaction contracts to visible controls, keep seller-price wording and synthetic labels honest, and do not return a visually active but behaviorally empty surface."
---

# DealPME Disclosure & Interactive Listing v3

Project the canonical fixture; never create a second business truth.

## Workflow
1. Read `references/disclosure-rules.md`, `references/output-contract.md`, `references/visual-spec.md` and `references/interaction-completeness.md`.
2. Generate T0, T1 and T2 explicitly with tier, indexability, gate and data.
3. For `SHARE_DEAL`, keep T1/T2 non-indexable; confidentiality must be enforced by authorization, not robots metadata.
4. Run `scripts/check_disclosure.py` before any UI generation.
5. Build every requested tab from canonical fields: overview, financials, transaction, risks, documents, Q&R and VDR entry.
6. Give every visible control a `data-control-id`/component equivalent and matching interaction contract.
7. Populate loading, empty, blocked, success and error states where the control can encounter them.
8. Run `scripts/validate_ui_contract.py` on the fixture/registry before handoff.

## Hard rules
- No identity, RCCM, asking price, valuation, offer terms, VDR link or direct confidential-document reference in T0/T1 for a share deal.
- Seller expectation must be labelled as such; never imply DealPME fair value/recommendation.
- Synthetic demo label must remain visible.
- Financial figures show year, unit and seller/source status.
- A visible tab with placeholder copy only is incomplete.
- A visible control with no route/handler/result is a release-blocking defect.
- VDR copy may promise deterrence, attribution and traceability, never prevention of screenshots/leaks.

## Outputs
`T0.json`, `T1.json`, `T2.json`, `disclosure-validation.json`, `announcement.md`, interactive component/HTML reference, `interaction-contract.json`, and visual reference screenshots when requested.

## VDR intelligence handoff
Do not design advanced VDR AI behavior inside this Skill. Use `dealpme-vdr-intelligence-architect` for DealLens, evidence graph, issue radar, Clean Team and permission-aware retrieval.
