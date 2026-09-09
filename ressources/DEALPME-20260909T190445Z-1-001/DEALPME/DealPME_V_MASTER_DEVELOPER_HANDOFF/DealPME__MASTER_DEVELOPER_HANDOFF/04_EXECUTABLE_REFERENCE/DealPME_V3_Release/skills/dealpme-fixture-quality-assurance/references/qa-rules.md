# DealPME fixture QA rulebook v3

## Severity model
### P0 — release blocker
- Synthetic fixture not labelled synthetic or `provenance.not_real_case != true`.
- Share-deal T0/T1 contains or nests identity, RCCM, seller price, valuation, offer terms, VDR/T2 links or exact sensitive values.
- Share-deal T1/T2 marked indexable.
- Core P&L arithmetic, EBITDA margin, balance sheet or cash-flow arithmetic fails.
- Deal-Ready certification can be awarded without named human/institutional decision.
- T2/VDR content is accessible without required gate.
- Admin has broad confidential visibility by default.
- Expert access is not scoped for expert scenarios/fixtures.
- Invalid lifecycle path bypasses verification or starts/ends in invalid states.
- DealPME is described as providing its own valuation, regulated advice or guaranteed result.
- Partner/API/control failure still ends in a success/completed/certificate state.

### P1 — correct before demonstration
- Missing financial year, unit/scale, evidence entry or provenance detail.
- Net debt/leverage/working-capital KPI does not reconcile.
- Seller asking price lacks seller attribution.
- VDR watermark/default-download/access metadata is incomplete.
- Service scenario lacks audit events, negative assertions, prohibited states or explicit capability status.
- English/French derivative changes a fact, gate or legal boundary.

### P2 — polish
- Weak terminology, excessive jargon, repetitive generic prose, inconsistent labels, poor scanning hierarchy or non-material plausibility warning.

## Finding format
Every finding must include:
`severity`, `rule_id`, `path`, `message`, `expected`, `recommendation`.

## Coverage
Report which rule families were applicable and evaluated. Do not present a high percentage as legal compliance; it is fixture-test coverage only.
