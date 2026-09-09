# DealPME V3 — Executable Reference & Skill Suite

**Release date:** 05/09/2026  
**Purpose:** canonical developer reference, synthetic test corpus, Skill suite and release-gate evidence for DealPME.

## What this package is

This release turns the DealPME samples into an **executable product specification**. It is deliberately stricter than a mock-up library: every visible control is expected to carry an interaction contract, every major surface is populated, and regulated/confidential paths have explicit success, blocked and failure states.

All businesses, people, documents, financials and transaction events in this release are **synthetic fixtures for development, QA and demonstration**.

## Package map

- `REFERENCE_PORTAL.html` — start here; browse all 36 interactive references.
- `gold-reference/` — PT-001 gold-standard Pass Transmission application, full VDR and deep QA evidence.
- `pass-transmission/` — 12 complete transaction candidates, each with six populated tabs, VDR, documents, Q&R, risks, financials and interaction contracts.
- `services/` — 24 interactive service scenarios: normal, remediation and control-failure cases across 8 services.
- `skill-packages/` — five individually installable `skill.zip` archives.
- `skills/` — full editable Skill source directories.
- `governance/` — global interaction registry, implementation standard, access matrix and release-gate rules.
- `qa/` — consolidated QA evidence.

## V3 quality result

- **5/5 Skills packaged and valid**
- **PT-001 gold reference:** 49/49 E2E tests PASS; dead-control P0 = 0; mutation regression 9/9 detected
- **12 Pass Transmission cases:** 12/12 cases PASS; 240/240 browser smoke tests PASS; 60/60 deterministic validators PASS
- **24 service scenarios:** 24/24 scenarios PASS; 216/216 interaction tests PASS; 8/8 semantic triplets PASS; 8/8 interaction sets PASS
- **Corpus:** 336 synthetic VDR documents, 120 Pass Transmission Q&R threads, 96 structured transaction risks
- **Interaction contracts:** 588 globally registered (372 Pass Transmission + 216 services)

## Developer rule

A sample is not complete because it looks complete. It is complete only when its data, content, permissions, interactions, blocked states, audit events and negative tests are all defined and executable.

**No visible control without an interaction contract. No visible tab without substantive content. Dead controls are release blockers.**

## Running the reference applications

For the most reliable local experience, extract the ZIP and serve its root with any static server. For example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/REFERENCE_PORTAL.html`.

The `standalone.html` files embed fixture data for portable review. Production developers must still implement server-side authorization and must not treat client-side demo state as a security boundary.
