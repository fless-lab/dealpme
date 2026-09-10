# @dealpme/connector-antivirus

Analyse antivirus des pièces déposées dans le dossier cédant (P04) puis, en V2, dans la data room (P12).

Règle : le verdict précède la mise à disposition. Une pièce sans verdict propre n'est jamais servie, ni au
déposant, ni à la CCI-Togo, ni à un repreneur. Une pièce infectée est refusée à l'entrée, jamais stockée, et la
signature du moteur est conservée dans le journal d'audit.

- `createFakeAntivirus()` : moteur de développement. Il reconnaît la chaîne de test EICAR, standard officiel pour
  vérifier une chaîne antivirus sans manipuler de code malveillant. Interdit en production.
- `createClamAvAdapter({ host, port })` : ClamAV via le protocole INSTREAM de clamd. Un moteur injoignable produit
  une erreur, jamais un verdict propre par défaut.

Sélection par `CONNECTOR_ANTIVIRUS_MODE` (`fake` en développement, `clamav` sinon).
