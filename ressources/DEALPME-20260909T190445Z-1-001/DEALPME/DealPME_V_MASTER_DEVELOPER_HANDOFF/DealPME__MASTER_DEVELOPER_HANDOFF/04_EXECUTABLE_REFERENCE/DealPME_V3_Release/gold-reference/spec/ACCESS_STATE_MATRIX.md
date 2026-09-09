# Matrice des états d’accès — PT-001

| Profil | Auth. | Qualifié | Admis | NDA | T2 | Approbation cédant | Révoqué | Résultat Ouvrir VDR |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `GUEST` | — | — | — | — | — | — | — | `LOGIN_REQUIRED` |
| `VERIFIED_BUYER` | ✓ | — | — | — | — | — | — | `QUALIFICATION_REQUIRED` |
| `QUALIFIED` | ✓ | ✓ | — | — | — | — | — | `ADMISSION_REQUIRED` |
| `ADMITTED` | ✓ | ✓ | ✓ | — | — | — | — | `NDA_REQUIRED` |
| `NDA_SIGNED` | ✓ | ✓ | ✓ | ✓ | — | — | — | `T2_GRANT_REQUIRED` |
| `AUTHORIZED` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | `VDR_HOME` |
| `REVOKED` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `ACCESS_REVOKED` |