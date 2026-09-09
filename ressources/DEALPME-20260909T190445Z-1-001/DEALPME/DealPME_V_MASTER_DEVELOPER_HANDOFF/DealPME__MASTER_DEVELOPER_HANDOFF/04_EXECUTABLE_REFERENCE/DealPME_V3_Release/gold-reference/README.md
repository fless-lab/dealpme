# DealPME Interactive Reference App v3 — PT-001

Cette application de référence transforme le fixture PT-001 en spécification exécutable. Tous les contrôles visibles importants sont reliés à un `control_id`, un gate, un état attendu et un événement d’audit.

## Lancer

```bash
python -m http.server 8765 --directory .
```

Puis ouvrir `http://127.0.0.1:8765/?dev=1`.

## Profils de test

Le mode `?dev=1` active le sélecteur de profil : `GUEST`, `VERIFIED_BUYER`, `QUALIFIED`, `ADMITTED`, `NDA_SIGNED`, `AUTHORIZED`, `REVOKED`.

## Surfaces couvertes

- Aperçu
- Données financières
- Transaction
- Risques
- Documents
- Q&R
- VDR

## Contrats

- `data/interaction-contract.json`
- `spec/UI_INTERACTION_REGISTRY.md`
- `spec/DEVELOPER_IMPLEMENTATION_STANDARD.md`
- `spec/RELEASE_GATE.md`

## Données

Tout est **100 % synthétique** et destiné au développement, à la QA et aux démonstrations. Aucun document n'est une pièce officielle.
