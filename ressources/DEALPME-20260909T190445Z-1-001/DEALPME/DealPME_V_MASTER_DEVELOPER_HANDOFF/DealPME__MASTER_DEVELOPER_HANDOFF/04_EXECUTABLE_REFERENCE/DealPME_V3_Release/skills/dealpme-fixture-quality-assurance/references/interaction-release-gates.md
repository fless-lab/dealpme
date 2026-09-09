# Interaction release gates

## P0 gates
- `UNREGISTERED_CONTROL`: a visible action has no interaction registry entry.
- `DEAD_CONTROL`: action is visible but runtime test detects no resulting state/change/modal/navigation.
- `MISSING_GATE`: sensitive action has no required profile/authorization contract.
- `MISSING_AUDIT_EVENT`: sensitive action has no audit event.
- `VDR_GATE_MATRIX_FAIL`: guest/qualification/admission/NDA/T2/revocation matrix does not produce the prescribed result.
- `BROKEN_REFERENCE`: risk/Q&R/document points to unknown evidence.

## Required runtime evidence
A golden Pass Transmission reference should prove:
1. six tabs populate meaningful content;
2. document row opens usable content and metadata;
3. Q&R can create a thread;
4. transaction CTAs change state;
5. VDR gate matrix behaves for guest, verified, qualified, admitted, NDA, authorized and revoked;
6. VDR folder and document navigation work;
7. download default is blocked;
8. desktop and mobile render without page-level overflow;
9. all visible controls carry registered IDs.
