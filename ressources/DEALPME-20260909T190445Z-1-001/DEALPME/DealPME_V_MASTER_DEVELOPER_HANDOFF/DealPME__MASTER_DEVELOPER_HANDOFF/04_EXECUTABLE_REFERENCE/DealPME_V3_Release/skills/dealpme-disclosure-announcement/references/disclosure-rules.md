# DealPME disclosure rules v3

## T0 — existence
Purpose: allow discovery without disclosing a confidential transaction.
May include: case reference, broad sector, broad region, size band, deal type, non-identifying headline, synthetic label.
Must not include for share deals: company/brand/person identity, RCCM, exact address, asking price, valuation, offer terms, detailed ownership, T2/VDR/document URLs, or facts that in combination make the company readily identifiable.

Recommended access metadata:
- `tier=T0`
- `indexable=true` only where the product's public-access policy allows it
- `access_condition=AUTHENTICATED_OR_PUBLIC_POLICY`

## T1 — anonymized teaser
Purpose: allow an admitted/qualified prospect to decide whether to request deeper access without identifying the target.
May add: anonymized financial profile, operating metrics, commercial description, broad seller rationale and transaction perimeter.
For share deals must not include: identity, RCCM, exact address, seller asking price, valuation, offer terms, T2 document links, VDR links or direct confidential document references.

Recommended access metadata:
- `tier=T1`
- `indexable=false` for share deals
- `access_condition=ADMISSION_IF_SHARE_DEAL`

## T2 — detailed authorized view
Purpose: support qualified diligence.
May show identity, seller asking price/expectation, transaction terms and VDR access status only after applicable gates.
Recommended metadata:
- `tier=T2`
- `indexable=false`
- `access_condition=NDA_EXECUTED_AND_T2_GRANTED`

## Compound-identification rule
Do not only check forbidden field names. For share-deal T0/T1, detect exact synthetic company name, RCCM, full street/address strings and T2-only URLs anywhere in nested objects, arrays or strings.

## Price wording
Allowed: `Attente du cédant`, `Prix demandé par le cédant`, `Indication fournie par le cédant`.
Disallowed unless a qualified external professional is explicitly identified: `Valorisation DealPME`, `Juste valeur`, `Prix recommandé`, `Valeur certifiée`, `Fair value DealPME`.

## Synthetic mode
Every tier and every visual reference must visibly carry `DÉMO SYNTHÉTIQUE · DONNÉES FICTIVES`. Synthetic RCCM/company data must also be visibly fictional in the canonical fixture.
