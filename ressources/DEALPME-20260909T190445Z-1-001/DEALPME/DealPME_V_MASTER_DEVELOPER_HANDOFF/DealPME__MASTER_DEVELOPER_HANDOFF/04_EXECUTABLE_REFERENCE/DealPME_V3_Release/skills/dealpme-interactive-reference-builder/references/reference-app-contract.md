# Reference app contract

The app must be a behavioral oracle for one fixture. All views derive from canonical data.

## Required Pass Transmission views
1. Overview
2. Financials
3. Transaction workspace
4. Structured risks
5. Document inventory
6. Q&R
7. VDR

## Required action classes
Navigation/tab, favorite, contact, interest, meeting request, document filter/open/download, Q&R filter/create, VDR open/search/folder/document/back, modal close and dev access-profile switching.

## Gate semantics
`GUEST → LOGIN_REQUIRED`  
`VERIFIED_BUYER → QUALIFICATION_REQUIRED`  
`QUALIFIED → ADMISSION_REQUIRED`  
`ADMITTED → NDA_REQUIRED`  
`NDA_SIGNED → T2_GRANT_REQUIRED`  
`AUTHORIZED → VDR_HOME`  
`REVOKED → ACCESS_REVOKED`

The real platform must enforce these authorizations server-side. The reference app simulates them deterministically for QA.
