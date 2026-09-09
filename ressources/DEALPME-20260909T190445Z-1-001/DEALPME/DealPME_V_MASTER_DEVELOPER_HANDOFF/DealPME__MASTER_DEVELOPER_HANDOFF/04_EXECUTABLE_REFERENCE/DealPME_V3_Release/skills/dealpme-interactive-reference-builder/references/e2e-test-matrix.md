# E2E acceptance matrix

A golden reference must prove at least:

1. six main tabs are visible and populated;
2. every visible control has a registered control ID;
3. financials contain P&L, balance sheet and cash flow;
4. document open shows actual synthetic content and metadata;
5. Q&R creation changes state;
6. transaction interest and meeting CTAs change state;
7. VDR gate matrix returns the prescribed result for each access profile;
8. authorized VDR opens;
9. VDR folders and documents are populated;
10. document selection opens viewer content;
11. download is blocked by default where configured;
12. revoked profile cannot open the VDR;
13. desktop and mobile have no page-level overflow;
14. runtime produces no console/page errors;
15. screenshots are captured for overview, financials, VDR and mobile.

Any failure in items 2, 7, 8, 10, 11 or 12 is P0.
