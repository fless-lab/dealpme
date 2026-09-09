# ADR 0005 : un port par dépendance externe, Remo.co compris

Date : 09/09/2026. Statut : accepté.

## Contexte

Le v0 nomme des vendeurs locaux réels (CinetPay, Hub2, PayDunya, prestataire PSC accrédité ARCEP, PSAE, CFE / RCCM)
et laisse plusieurs choix ouverts (API du registre, partenaire fiscal, fournisseur IA). Le 09/09/2026, Remo.co est
retenu pour les salons et rendez-vous virtuels de Deal-Connect et du Guichet Diaspora.

## Décision

`codebases/external_connectors/<nom>` : un port (interface TypeScript), des adaptateurs par vendeur, un faux pour les
tests. L'API et le worker ne dépendent que du port ; l'adaptateur est choisi par variable d'environnement.
Pour Remo.co, le module `events` porte un `RemoBridgeService` à deux modes : DEALPME_FIRST (inscription, consentement,
attribution, paiement mobile money et revenus chez DealPME ; session live chez Remo) et REMO_FIRST (Remo porte aussi
inscription et billetterie carte, DealPME synchronise pour l'attribution et le reporting).

## Conséquences

- Aucun contrat signé n'est requis pour développer : les faux permettent les tests et la démonstration.
- Le remplacement d'un vendeur ne touche qu'un adaptateur.
- Le périmètre exact de l'API Remo.co (SSO, webhooks de présence, marque blanche) reste à cadrer sur leur
  documentation avant le chiffrage définitif de V4 (jalon J14) ; le port sera ajusté en conséquence.
