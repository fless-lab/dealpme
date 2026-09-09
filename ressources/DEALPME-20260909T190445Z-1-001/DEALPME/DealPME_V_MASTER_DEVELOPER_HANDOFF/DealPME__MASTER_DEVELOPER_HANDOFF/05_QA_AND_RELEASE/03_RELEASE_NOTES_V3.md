# DealPME V3 — Release Notes

## V3 objective

Remove developer discretion from the reference corpus where discretion could create product, regulatory, security or user-experience drift.

## Major changes from V2

### 1. Executable interaction contracts
Every visible control now resolves to an explicit control ID and interaction contract describing action, permission/gate, target, success state, blocked/failure behavior and audit event.

### 2. Complete Pass Transmission surfaces
The 12 transaction fixtures now include populated Overview, Financials, Transaction, Risks, Documents and Q&R tabs plus an interactive VDR entry path. Each transaction case includes a 28-document synthetic diligence corpus, structured risks and Q&R.

### 3. Full VDR state matrix
The reference covers guest, verified-but-unqualified, qualified, admitted, NDA-required, T2-pending, authorized and revoked states. The demo is a behavior reference only; production enforcement belongs server-side.

### 4. 24 executable service scenarios
Eight services now have normal, remediation and control-failure scenarios, each with working tabs/actions, test profiles, audit evidence and prohibited states.

### 5. Capability maturity labels
Service fixtures explicitly distinguish `GOVERNED_V0`, `PARTNER_DEPENDENT` and `FUTURE_TARGET` so demos do not silently market an unactivated capability as current product behavior.

### 6. Stronger QA release gates
V3 adds dead-control coverage, broken-reference checks, interaction-contract validation, permission-state testing, content completeness, financial reconciliation, disclosure leakage checks and mutation regression.

### 7. Fifth Skill
`dealpme-interactive-reference-builder` turns canonical fixtures into executable developer references and acceptance-test surfaces.

## Skill set

1. `dealpme-deal-fixture-architect`
2. `dealpme-disclosure-announcement`
3. `dealpme-service-scenario-generator`
4. `dealpme-fixture-quality-assurance`
5. `dealpme-interactive-reference-builder`

## Deliberate constraints

- All fixtures are synthetic.
- Seller financial figures remain source-labelled; the platform does not turn a fixture into an audited statement.
- Deal-Ready automated pre-flight never substitutes for the named human/institutional decision where required.
- VDR controls demonstrate deterrence, attribution, permissions and auditability; they do not claim that screenshots or photographs can be technically prevented.
- Partner-dependent or future regulated capabilities remain explicitly labelled and are not promoted to live V0 behavior by the fixture generator.
