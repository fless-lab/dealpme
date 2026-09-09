# DealPME service fixture schema v3

## Root required fields
- `schema_version`: `3.0`
- `fixture_kind`: `SERVICE_SCENARIO`
- `synthetic`: `true`
- `scenario_id`
- `service` and `service_label`
- `archetype`: `NORMAL`, `REMEDIATION`, or `CONTROL_FAILURE`
- `capability_status`: `GOVERNED_V0`, `PARTNER_DEPENDENT`, or `FUTURE_TARGET`
- `objective`
- `state_in`
- `trigger`
- `actors`
- `inputs`
- `controls`
- `dependencies`
- `events`
- `human_decision`
- `state_out`
- `prohibited_states`
- `expected_user_message`
- `audit_events`
- `negative_assertions`
- `qa_assertions`
- `evidence_pack`
- `primary_action`
- `secondary_action`
- `interaction_contracts`
- `test_profiles`
- `provenance`

## actors
Array of objects containing `role`, `responsibility`, `accountable_for`, and `access_scope`.

## inputs
Array of objects containing `name`, `status`, `evidence_status`, and `source`.

## controls
Array of objects containing `id`, `severity`, `rule`, `owner`, `expected_evidence`, and `blocking`.

## dependencies
Array of objects containing `name`, `status`, `required`, `partner_dependent`, and an explicit `fallback` where one exists.

## events
Ordered objects containing `seq`, `type`, `actor`, `result`, and `audit_event`. The sequence must show creation, input validation, control gate, human gate where relevant, output state, and audit recording.

## human_decision
Object containing `required`, `owner`, `decision`, and `evidence`. When `required=false`, explain why the action is deterministic and what rule owns the outcome.

## interaction_contracts
Every visible control must define:
- `control_id`
- `surface`
- `label`
- `action`
- `target`
- `required_profile`
- `success_state`
- `blocked_state` and `blocked_message` where applicable
- `audit_event`

## failure cases
A `CONTROL_FAILURE` fixture must identify prohibited success states and prove that the triggering fault cannot resolve to success. The primary action may surface the block, route to remediation, or request external review, but it must never silently bypass the control.

## provenance
Use `type=SYNTHETIC_TEST_DATA`, `generated_for`, and `not_real_case=true`. Do not create company, expert, regulator, certificate or transaction data that could be mistaken for a live record.
