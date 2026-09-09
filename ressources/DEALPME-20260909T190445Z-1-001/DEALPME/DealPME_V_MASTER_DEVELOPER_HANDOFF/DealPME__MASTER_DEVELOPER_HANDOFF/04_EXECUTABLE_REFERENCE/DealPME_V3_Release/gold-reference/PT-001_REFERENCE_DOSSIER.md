# DealPME PT-001 — TropicVale Industries SA
> **DÉMO SYNTHÉTIQUE · DONNÉES FICTIVES · AUCUNE ENTREPRISE RÉELLE**
## Finalité du fixture v3
Référence exécutable pour les équipes produit et développement : données, écrans, interactions, contrôles d’accès, VDR, documents, Q&R, risques, transaction et tests négatifs doivent dériver de la même vérité canonique.
## Synthèse
- Secteur : Agroalimentaire
- Implantation : Lomé / Kpalimé
- CA 2025 : 2 120 M FCFA
- EBITDA 2025 : 377 M FCFA (17,8 %)
- Dette brute / trésorerie / dette nette : 410 / 117 / 293 M FCFA
- Effectif : 62
- Cession : 100 % des titres
- Attente du cédant : 2 850 M FCFA — **non valorisation DealPME**
- Deal-Ready : 91/100, décision humaine institutionnelle synthétique, périmètre limité à existence/immatriculation/complétude documentaire.
## Surfaces obligatoires
- Aperçu
- Données financières
- Transaction
- Risques
- Documents
- Q&R
- VDR

## Contrat d’interaction
17 contrôles visibles ou dev sont enregistrés. Aucun contrôle visible ne doit exister sans action, gate, état de succès/échec et événement d’audit.
## Corpus VDR
28 documents synthétiques répartis dans 10 dossiers. Téléchargement désactivé par défaut, filigrane requis, révocation cible ≤60 s.
## Q&R
14 fils de diligence préremplis couvrant finance, commercial, approvisionnement, opérations, RH, fiscalité, réglementation, systèmes et transaction.
## Risques
- **R-COM-01 · Concentration clients** — MEDIUM / OPEN · preuve : DOC-COM-001, DOC-COM-002
- **R-SUP-01 · Saisonnalité de la matière première** — MEDIUM / MITIGATING · preuve : DOC-SUP-001, DOC-SUP-002
- **R-FIN-01 · Hausse du besoin en fonds de roulement** — MEDIUM / OPEN · preuve : DOC-FIN-003, DOC-FIN-004
- **R-FIN-02 · Dette bancaire brute** — LOW / MONITORED · preuve : DOC-FIN-005
- **R-OPS-01 · Dépendance à la ligne de pasteurisation** — MEDIUM / MITIGATING · preuve : DOC-AST-001, DOC-AST-002
- **R-HR-01 · Dépendance au fondateur** — MEDIUM / MITIGATING · preuve : DOC-HR-002, DOC-TRX-002
- **R-TAX-01 · Contrôle documentaire sur TVA export** — LOW / CLOSED · preuve : DOC-TAX-002
- **R-REG-01 · Maintien des autorisations qualité** — MEDIUM / MONITORED · preuve : DOC-REG-001, DOC-REG-002
- **R-IT-01 · ERP partiellement dépendant de procédures manuelles** — LOW / OPEN · preuve : DOC-OPS-003
- **R-TRX-01 · Conditions de transfert des principaux contrats** — MEDIUM / OPEN · preuve : DOC-COM-002, DOC-SUP-001

## Tests de gate VDR
- NEG-001 : GUEST + OPEN_VDR → `LOGIN_REQUIRED`
- NEG-002 : VERIFIED_BUYER + OPEN_VDR → `QUALIFICATION_REQUIRED`
- NEG-003 : QUALIFIED + OPEN_VDR → `ADMISSION_REQUIRED`
- NEG-004 : ADMITTED + OPEN_VDR → `NDA_REQUIRED`
- NEG-005 : NDA_SIGNED + OPEN_VDR → `T2_GRANT_REQUIRED`
- NEG-006 : REVOKED + OPEN_VDR → `ACCESS_REVOKED`
- NEG-007 : AUTHORIZED + DOWNLOAD_DOCUMENT on default document → `DOWNLOAD_BLOCKED`
- NEG-008 : T1 share deal + serialize → `company/rccm/asking absent`
