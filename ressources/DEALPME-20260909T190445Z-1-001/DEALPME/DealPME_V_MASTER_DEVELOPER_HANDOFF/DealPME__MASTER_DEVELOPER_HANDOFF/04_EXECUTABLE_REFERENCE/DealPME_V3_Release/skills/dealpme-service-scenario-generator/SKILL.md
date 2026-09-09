---
name: dealpme-service-scenario-generator
description: "Generate synthetic normal, remediation and control-failure fixtures for DealPME services beyond Pass Transmission, including Deal-Ready, Deal-Experts, VDR/Q&A, Alerte & Rebond, LegalTech OHADA, Conformité & Fiscalité, Deal-Connect and Guichet Diaspora. Use for executable product references, dev seed data, operator training and acceptance tests. Include actors, human gates, dependencies, state transitions, audit evidence, visible-control interaction contracts and explicit negative outcomes while separating governed v0, partner-dependent and future capabilities."
---

# DealPME Service Scenario Generator v3

Generate behaviorally complete service fixtures. Every service triplet must test the normal path, remediation path and control/dependency failure path.

## Workflow
1. Read `references/scenario-catalog.md`, `references/service-fixture-schema.md`, `references/interaction-contracts.md` and `references/cross-skill-contract.md`.
2. Generate exactly `NORMAL`, `REMEDIATION`, `CONTROL_FAILURE` unless more are requested.
3. Use schema 3.0 for new fixtures. Mark synthetic and capability status: `GOVERNED_V0`, `PARTNER_DEPENDENT` or `FUTURE_TARGET`.
4. Define actors, inputs, controls, dependencies, events, human decision, state out, prohibited states, audit events and negative assertions.
5. Add visible controls plus success/blocked/error states. No sample UI control may be inert.
6. Run `scripts/validate_triplet.py` and `scripts/validate_service_interactions.py`.

## Boundaries
- Deal-Ready award/revoke is a named human institutional decision.
- Expert access is scoped and expiring; conflict blocks/revokes.
- VDR access requires applicable NDA/grant and revocation works.
- Distress/conciliation cases are not open-search content.
- LegalTech output is drafting aid requiring qualified review; employment contracts are national law, not an OHADA Uniform Act product.
- Tax partner/API failure never yields false certificate/success.
- Deal-Connect contact sharing requires applicable consent and low-bandwidth fallback.
- Diaspora FX/repatriation questions route to bank/counsel; DealPME does not autonomously advise.
- Escrow/payment execution is not a governed v0 capability unless clearly partner-dependent/future and legally activated.

## Outputs per scenario
`sample.md`, `fixture.json`, `validation.json`, `showcase.md`, interaction contracts, and interactive visual reference when requested.

## VDR scenarios
When a service scenario exercises VDR/Q&R or document intelligence, use `dealpme-vdr-intelligence-architect` for permissions, AI retrieval, citations and Clean Team behavior.
