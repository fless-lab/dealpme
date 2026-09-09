# Service scenario catalog v3

## Deal-Ready
- NORMAL: complete dossier reaches named human certification review; certification may be awarded only by the institution.
- REMEDIATION: missing lease/tax/ownership evidence creates open items and returns the case for correction.
- CONTROL_FAILURE: ownership/RCCM inconsistency, conflict or other blocking issue prevents certification.
Required control: `human_decision.required=true`.

## Deal-Experts
- NORMAL: scoped QoE/tax/legal mandate with temporary file/folder access.
- REMEDIATION: no suitable expert or scope change requires re-routing/re-quote.
- CONTROL_FAILURE: conflict of interest; assignment blocked or access revoked.
Required control: access scope and expiry.

## VDR/Q&A
- NORMAL: NDA-gated access, watermark, tracked document view and Q&A.
- REMEDIATION: missing document or time-extension request.
- CONTROL_FAILURE: suspicious behavior, leak concern or revoked mandate; access revoked and event logged.
Required control: no detailed access without declared gates.

## Alerte & Rebond
- NORMAL: early liquidity stress, confidential diagnostic and action plan.
- REMEDIATION: conciliation-linked case under elevated confidentiality and professional referral.
- CONTROL_FAILURE/SPECIAL: bank/NPL asset flow requires manual agreement and closed counterparty set.
Required control: no open-search publication for protected distress cases.

## LegalTech OHADA
- NORMAL: NDA generated from reviewed template and routed for professional review/signature.
- REMEDIATION: LOI/share-transfer restrictions trigger counsel review.
- CONTROL_FAILURE/BOUNDARY: employment contract is governed by national labour law; block any claim that it is governed by an OHADA uniform act.
Required control: drafting-aid disclaimer.

## Conformité & Fiscalité
- NORMAL: simulation/filing via approved workflow.
- REMEDIATION: missing source evidence pauses submission.
- CONTROL_FAILURE: partner/API outage returns pending/failure state; never a false certificate or successful filing.

## Deal-Connect
- NORMAL: sector event with consented matchmaking and meeting completion.
- REMEDIATION: no-show/rebooking or low relevance requiring operator adjustment.
- CONTROL_FAILURE: low bandwidth; video fails but audio fallback is used and event truth reflects actual channel.
Required control: consent before contact exchange.

## Guichet Diaspora
- NORMAL: qualified diaspora buyer receives eligible opportunities and remote appointment.
- REMEDIATION: remote diligence requires document/evidence follow-up.
- CONTROL_FAILURE/HOLD: FX, repatriation or authorization issue places transaction on hold and routes to bank/counsel.
Required control: DealPME provides workflow/signposting, not autonomous regulated advice.
