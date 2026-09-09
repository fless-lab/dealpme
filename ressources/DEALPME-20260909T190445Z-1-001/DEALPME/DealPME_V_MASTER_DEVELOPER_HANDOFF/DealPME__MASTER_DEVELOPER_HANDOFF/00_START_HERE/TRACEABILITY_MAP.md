# Traceability Map

This map tells the development team which artifacts govern which implementation decisions.

| Concern | Primary source | Implementation artifact | Test/registry |
|---|---|---|---|
| Product scope & legal posture | `01_SOURCE_BASIS/01_DealPME_v0_Approved_Build_Specification.pdf` | Canonical release under `04_EXECUTABLE_REFERENCE/` | `03_DEVELOPER_GUIDES/04_RELEASE_GATE.md` |
| Partner/institution responsibilities | `01_SOURCE_BASIS/03_DealPME_CCI_Togo_Convention_20Aug2026.docx` | service + institutional workflows | scenario fixtures / QA |
| Brand and communication controls | `01_SOURCE_BASIS/04_DEALPME_Brand_Templates.pdf` | reference apps / visual boards | visual review |
| Pass Transmission fixture truth | each `PT-xxx/data/fixture.v3.json` | each PT app | main interaction contract |
| Disclosure | PT fixture + disclosure data | PT app | global interaction registry |
| VDR permissions | `03_DEVELOPER_GUIDES/03_ACCESS_STATE_MATRIX.md` | each PT `vdr-intelligence/` app | VDR interaction registry |
| VDR AI / DealLens | VDR implementation guide + `deallens-policy.json` | document intelligence files | VDR validators / AI citation checks |
| Evidence graph | `evidence-map.json` | Risks / Q&R / DealLens surfaces | case QA |
| Financial reconciliation | `financial-tieout.json` | Financial / DealLens surfaces | financial validators |
| Service behavior | service `fixture.v3.json` | service standalone app | service interaction contract + e2e |
| Release decision | governance release gate | full product | QA reports |
