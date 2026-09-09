# Release-blocking QA

- AI-01 Permission leak: a user cannot extract or infer facts unique to an inaccessible document.
- AI-02 Clean Team: standard users never retrieve Clean Team chunks.
- AI-03 Citation integrity: every material AI fact resolves to an authorized document/version/page/anchor.
- AI-04 Insufficient evidence: no speculative completion when sources do not support an answer.
- AI-05 Revocation: revoked documents stop viewer and AI access.
- AI-06 Read-only: AI drafts remain drafts until explicit human action.
- DOC-01 Downloads default off and are enforced server-side.
- DOC-02 Watermark carries viewer identity/account, timestamp and deal reference where required.
- DOC-03 A new version gets a new analysis state; prior AI output is not silently reused.
- QA-01 A question author cannot bypass an enabled question coordinator.
- ACL-01 Expert access is scoped and expiring.
- ACL-02 Clean Team grants are named, reasoned and auditable.
- UI-01 Every visible control has an interaction contract and deterministic outcome.
- UI-02 Any dead control is a release blocker.
