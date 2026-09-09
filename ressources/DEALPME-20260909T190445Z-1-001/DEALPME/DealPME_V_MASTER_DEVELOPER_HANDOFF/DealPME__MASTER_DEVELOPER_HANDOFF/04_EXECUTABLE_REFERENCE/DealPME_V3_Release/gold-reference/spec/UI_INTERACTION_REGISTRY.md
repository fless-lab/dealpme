# DealPME UI Interaction Registry — PT-001 v3

> **Règle de release : aucun contrôle visible sans entrée dans ce registre.**

| Control ID | Surface | Libellé | Action | Gate | État de succès | État bloqué | Audit |
|---|---|---|---|---|---|---|---|
| `TAB_OVERVIEW` | DEAL_DETAIL | Aperçu | `SHOW_TAB` | `GUEST` | `TAB_OVERVIEW` | `—` | `TAB_VIEWED` |
| `TAB_FINANCIALS` | DEAL_DETAIL | Données financières | `SHOW_TAB` | `AUTHORIZED` | `TAB_FINANCIALS` | `ACCESS_GATE` | `TAB_VIEWED` |
| `TAB_TRANSACTION` | DEAL_DETAIL | Transaction | `SHOW_TAB` | `AUTHORIZED` | `TAB_TRANSACTION` | `ACCESS_GATE` | `TAB_VIEWED` |
| `TAB_RISKS` | DEAL_DETAIL | Risques | `SHOW_TAB` | `AUTHORIZED` | `TAB_RISKS` | `ACCESS_GATE` | `TAB_VIEWED` |
| `TAB_DOCUMENTS` | DEAL_DETAIL | Documents | `SHOW_TAB` | `AUTHORIZED` | `TAB_DOCUMENTS` | `ACCESS_GATE` | `TAB_VIEWED` |
| `TAB_QA` | DEAL_DETAIL | Q&R | `SHOW_TAB` | `AUTHORIZED` | `TAB_QA` | `ACCESS_GATE` | `TAB_VIEWED` |
| `OPEN_VDR` | DEAL_DETAIL | Ouvrir la VDR | `OPEN_VDR` | `AUTHORIZED` | `VDR_HOME` | `—` | `VDR_OPEN_ATTEMPT` |
| `TOGGLE_FAVORITE` | DEAL_DETAIL | Favoris | `TOGGLE_FAVORITE` | `GUEST` | `FAVORITE_UPDATED` | `—` | `FAVORITE_UPDATED` |
| `CONTACT_SELLER` | DEAL_DETAIL | Contacter le cédant | `REQUEST_CONTACT` | `AUTHORIZED` | `CONTACT_REQUESTED` | `—` | `CONTACT_REQUEST_CREATED` |
| `EXPRESS_INTEREST` | TRANSACTION | Manifester mon intérêt | `EXPRESS_INTEREST` | `QUALIFIED` | `INTEREST_RECORDED` | `—` | `INTEREST_RECORDED` |
| `REQUEST_MEETING` | TRANSACTION | Demander une réunion management | `REQUEST_MEETING` | `AUTHORIZED` | `MEETING_REQUESTED` | `—` | `MEETING_REQUESTED` |
| `OPEN_DOCUMENT` | DOCUMENTS | Ouvrir | `OPEN_DOCUMENT` | `AUTHORIZED` | `DOCUMENT_VIEWER` | `—` | `DOCUMENT_VIEWED` |
| `DOWNLOAD_DOCUMENT` | VDR | Télécharger | `DOWNLOAD_DOCUMENT` | `AUTHORIZED` | `DOWNLOAD_ALLOWED` | `DOWNLOAD_BLOCKED` | `DOWNLOAD_ATTEMPT` |
| `ASK_QUESTION` | QA | Poser une question | `ASK_QUESTION` | `AUTHORIZED` | `QUESTION_CREATED` | `—` | `QUESTION_CREATED` |
| `DEV_SET_PROFILE` | DEV_TOOLS | Profil d’accès | `SET_PROFILE` | `GUEST` | `PROFILE_CHANGED` | `—` | `DEV_PROFILE_CHANGED` |
| `NAV_OPPORTUNITIES` | GLOBAL_NAV | Entreprises à céder | `NAVIGATE_REFERENCE` | `GUEST` | `TAB_OVERVIEW` | `—` | `NAVIGATION` |
| `NAV_BUYERS` | GLOBAL_NAV | Repreneurs | `OUT_OF_FIXTURE_SCOPE` | `GUEST` | `SCOPE_NOTICE` | `—` | `NAVIGATION` |
| `NAV_SERVICES` | GLOBAL_NAV | Services | `OUT_OF_FIXTURE_SCOPE` | `GUEST` | `SCOPE_NOTICE` | `—` | `NAVIGATION` |
| `NAV_RESOURCES` | GLOBAL_NAV | Ressources | `OUT_OF_FIXTURE_SCOPE` | `GUEST` | `SCOPE_NOTICE` | `—` | `NAVIGATION` |
| `NAV_ABOUT` | GLOBAL_NAV | À propos | `OUT_OF_FIXTURE_SCOPE` | `GUEST` | `SCOPE_NOTICE` | `—` | `NAVIGATION` |
| `BACK_TO_OPPORTUNITIES` | DEAL_DETAIL | Retour aux opportunités | `OUT_OF_FIXTURE_SCOPE` | `GUEST` | `SCOPE_NOTICE` | `—` | `NAVIGATION` |
| `DOCUMENT_SEARCH` | DOCUMENTS | Rechercher un document | `FILTER_INPUT` | `AUTHORIZED` | `FILTER_APPLIED` | `—` | `FILTER_APPLIED` |
| `DOCUMENT_FOLDER_FILTER` | DOCUMENTS | Filtrer par dossier | `FILTER_SELECT` | `AUTHORIZED` | `FILTER_APPLIED` | `—` | `FILTER_APPLIED` |
| `QA_STATUS_FILTER` | QA | Filtrer les Q&R | `FILTER_SELECT` | `AUTHORIZED` | `FILTER_APPLIED` | `—` | `FILTER_APPLIED` |
| `VDR_BACK` | VDR | Retour au dossier | `CLOSE_VDR` | `AUTHORIZED` | `TAB_OVERVIEW` | `—` | `VDR_CLOSED` |
| `VDR_SEARCH` | VDR | Rechercher dans la VDR | `FILTER_INPUT` | `AUTHORIZED` | `FILTER_APPLIED` | `—` | `FILTER_APPLIED` |
| `VDR_SELECT_FOLDER` | VDR | Sélectionner un dossier | `SELECT_FOLDER` | `AUTHORIZED` | `VDR_FOLDER_SELECTED` | `—` | `VDR_FOLDER_SELECTED` |
| `VDR_SELECT_DOCUMENT` | VDR | Sélectionner un document | `SELECT_DOCUMENT` | `AUTHORIZED` | `DOCUMENT_VIEWER` | `—` | `DOCUMENT_VIEWED` |
| `MODAL_CLOSE` | MODAL | Fermer | `CLOSE_MODAL` | `GUEST` | `MODAL_CLOSED` | `—` | `MODAL_CLOSED` |
| `QUESTION_SUBMIT` | QA | Créer la question | `SUBMIT_QUESTION` | `AUTHORIZED` | `QUESTION_CREATED` | `—` | `QUESTION_CREATED` |
| `QUESTION_TEXT_INPUT` | QA | Texte de la question | `INPUT_TEXT` | `AUTHORIZED` | `DRAFT_UPDATED` | `—` | `QUESTION_TEXT_CHANGED` |

## Doctrine

1. Tout contrôle visible doit porter un `data-control-id` stable et figurer dans le registre.
2. Le gate doit être vérifié côté serveur dans l’application cible ; l’application de référence simule le résultat attendu.
3. Une action bloquée retourne un état métier explicite, jamais un échec générique.
4. Toute action sensible écrit un événement d’audit corrélable sans journaliser le contenu confidentiel.
5. Les contrôles hors périmètre PT-001 répondent par `SCOPE_NOTICE` au lieu de rester inertes.
