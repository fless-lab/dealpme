# Fixture schema v3

## Required roots

`schema_version`, `fixture_kind`, `synthetic`, `case_id`, `meta`, `master`, `financials`, `disclosure`, `deal_ready`, `transaction_workspace`, `risk_register`, `documents`, `qa_threads`, `vdr`, `interaction_profiles`, `interaction_contracts`, `interaction_rules`, `expected_state_path`, `expected_audit_events`, `evidence_ledger`, `provenance`, `ui_copy_contract`.

## Financial truth
- 5 years: `income_statement`.
- 3 years: `balance_sheet`, `cash_flow`.
- `financials.kpis` must reconcile to reference-year statements.
- `net_debt = debt - cash`; keep gross debt and cash separately.
- Use ratios as decimals in canonical JSON (`0.178`, not `17.8`).

## Transaction workspace
Include deal type, legal form, stake, seller expectation and source, debt/cash/BFR convention, seller support, completion window, buyer profile, current stage and ordered stages.

## Risk object
`risk_id`, `category`, `title`, `severity`, `probability`, `status`, `description`, `evidence[]`, `owner`, `mitigation`, `buyer_question`, optional `linked_qa`.

## Document object
`document_id`, `folder`, `title`, `document_type`, `status`, `tier`, `date`, `version`, `pages`, `download_allowed`, `watermark_required`, `owner`, `file_path`, `summary`, `synthetic`, `hash`.

Every synthetic document must include an unmistakable fake/demo warning inside its content.

## Q&R object
`qa_id`, `category`, `document_id`, `question`, `asked_by`, `assigned_to`, `status`, `visibility`, `asked_at`, `answer`, `answered_at`, `attachments[]`.

## UI surfaces
A complete Pass Transmission fixture supports at least:
`overview`, `financials`, `transaction`, `risks`, `documents`, `qa`, `vdr`.
