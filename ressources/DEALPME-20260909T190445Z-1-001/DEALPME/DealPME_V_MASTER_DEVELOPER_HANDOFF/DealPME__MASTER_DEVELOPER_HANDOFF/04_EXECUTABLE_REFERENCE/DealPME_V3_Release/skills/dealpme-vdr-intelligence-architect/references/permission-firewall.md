# Permission firewall

Apply every gate before retrieval:
1. authenticated session;
2. deal access;
3. disclosure tier T0/T1/T2;
4. RPS admission where applicable;
5. NDA state;
6. folder/document ACL;
7. Clean Team membership;
8. expert mandate scope/expiry;
9. revocation state;
10. document version status.

Construct an authorized document/chunk set and query only that set. Never retrieve globally and hide later.

A denied request must not reveal that the hidden document exists when existence is itself confidential. Use NOT_FOUND semantics in that case.

Revocation must propagate to viewer tokens, downloads, semantic indexes and cached AI retrieval immediately within the VDR revocation SLA.
