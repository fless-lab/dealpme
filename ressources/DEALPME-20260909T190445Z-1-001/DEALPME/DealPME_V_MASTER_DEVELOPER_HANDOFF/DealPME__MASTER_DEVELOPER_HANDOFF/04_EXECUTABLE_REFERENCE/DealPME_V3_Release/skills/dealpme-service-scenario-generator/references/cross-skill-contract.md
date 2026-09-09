# Cross-skill contract for service scenarios v3

- Link to a `case_id` when a service scenario belongs to a Pass Transmission case, but reference the canonical case rather than copying or changing its financial truth.
- Use `schema_version=3.0` for new scenarios.
- Keep every generated Markdown, JSON, HTML and screenshot visibly synthetic.
- Make every human decision, external dependency and future capability explicit.
- Generate exactly one normal, one remediation and one control-failure case per service family unless a different test plan is requested.
- Give every failure scenario at least one prohibited success state and an audit event that proves the block, revocation or hold.
- Give every visible control an interaction contract. No UI action may rely on developer inference.
- Let downstream QA determine PASS/FAIL from machine-readable state, controls and assertions without needing prose-only interpretation.
- Keep partner-dependent financial, tax, legal, settlement or expert functions labelled as such.
- Do not convert a reference workflow into legal, tax, regulatory, accounting or investment advice.
