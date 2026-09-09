# DealLens (V5)

Assistant IA de diligence pour la data room (VDR Intelligence). Service Python séparé, appelé par l'API plateforme.

Principes non négociables (guide d'implémentation VDR, corpus V3.1) :

1. Filtrage des permissions avant récupération, jamais "récupérer puis masquer".
2. L'IA n'en sait jamais plus que l'utilisateur connecté.
3. Lecture seule : explique, résume, extrait, compare, propose ; ne publie, ne certifie, ne transige jamais.
4. Citation obligatoire (document, version, page, ancre) sur toute affirmation matérielle.
5. Réponse d'insuffisance explicite quand la preuve manque.
6. Révocation transitive et immédiate.
7. Isolation Clean Team.

Prérequis avant tout développement : contrat avec un fournisseur de modèle sous clauses de confidentialité
(aucune réutilisation des données, hébergement conforme). Jalon J16 du classeur de suivi.

Structure prévue : `deallens/firewall.py` (pare-feu de permission), `deallens/retrieval.py` (index filtré par
`permission_scope_hash`), `deallens/answer.py` (contrat de réponse : citations, confiance, insuffisance),
`deallens/api.py` (FastAPI, réseau privé uniquement).
