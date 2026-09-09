# Interaction contract schema

Every visible control must map to one contract:

```json
{
  "control_id": "OPEN_VDR",
  "surface": "DEAL_DETAIL",
  "label": "Ouvrir la VDR",
  "action": "OPEN_VDR",
  "target": "vdr",
  "required_profile": "AUTHORIZED",
  "success_state": "VDR_HOME",
  "blocked_state": "ACCESS_GATE",
  "audit_event": "VDR_OPEN_ATTEMPT"
}
```

## Required semantics
- stable `control_id`;
- surface and human label;
- action and target;
- gate/profile;
- deterministic success state;
- blocked/error state where applicable;
- audit event for sensitive actions.

## Minimum PT controls
Six main tabs, open VDR, favorite, seller contact, express interest, request management meeting, document search/filter/open/download, Q&R filter/create, VDR search/folder/document/back, modal close and developer-profile selector for the test harness.

A fixture that exposes a visible control without a contract is incomplete.
