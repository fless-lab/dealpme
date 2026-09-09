# Service interaction contracts

Every visible service action must specify `control_id`, `surface`, `label`, `action`, `target`, `required_profile`, `success_state`, blocked/error state where relevant, and `audit_event`.

Examples: start audit, upload evidence, submit, correct, award/reject, hire expert, accept proposal, open scoped file, revoke expert, create event, book meeting, request contact, start tax simulation, retry provider, generate LegalTech draft, request professional review, request diaspora appointment.

A control-failure fixture must prove the success state cannot occur.
