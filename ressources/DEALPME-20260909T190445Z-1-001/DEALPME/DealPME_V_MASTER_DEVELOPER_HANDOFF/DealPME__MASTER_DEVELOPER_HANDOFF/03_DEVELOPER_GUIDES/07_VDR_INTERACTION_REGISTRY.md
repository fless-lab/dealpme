# DealPME VDR Intelligence — Interaction Registry

**456 registered VDR interaction contracts across 12 Pass Transmission fixtures.**

| Case | Control | Label | Action | Target | Profile | Audit |
|---|---|---|---|---|---|---|
| PT-001 | `NAV_COCKPIT` | Cockpit | `SHOW_VIEW` | `cockpit` | VERIFIED | `VDR_UI_ACTION` |
| PT-001 | `NAV_DOCUMENTS` | Documents | `SHOW_VIEW` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `NAV_DEALLENS` | DealLens IA | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `NAV_QA` | Q&R | `SHOW_VIEW` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `NAV_ISSUES` | Risques | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `NAV_ENGAGEMENT` | Engagement | `SHOW_VIEW` | `engagement` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `NAV_AUDIT` | Audit | `SHOW_VIEW` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `NAV_ACCESS` | Accès | `SHOW_VIEW` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `GLOBAL_SEARCH` | Recherche globale | `FILTER_INPUT` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `SELECT_FOLDER` | Sélectionner un dossier | `SELECT_FOLDER` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `SELECT_DOCUMENT` | Sélectionner un document | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `EXPORT_SUMMARY` | Exporter la synthèse | `EXPORT_REFERENCE` | `cockpit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `OPEN_DEALLENS` | Interroger DealLens | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `OPEN_ISSUE_RADAR` | Ouvrir l’Issue Radar | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `COMPARE_VERSIONS` | Comparer versions | `OPEN_COMPARE` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `ADD_FAVORITE` | Ajouter aux favoris | `TOGGLE_FAVORITE` | `document` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `ZOOM_OUT` | Zoom - | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `ZOOM_LEVEL` | Niveau zoom | `VIEWER_STATUS` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `ZOOM_IN` | Zoom + | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `AI_TAB_SUMMARY` | Résumé IA | `AI_PANEL_TAB` | `summary` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `AI_TAB_FACTS` | Faits IA | `AI_PANEL_TAB` | `facts` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `AI_TAB_RISKS` | Risques IA | `AI_PANEL_TAB` | `risks` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `AI_TAB_COMPARE` | Comparer IA | `AI_PANEL_TAB` | `compare` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `AI_TAB_QA` | Q&R IA | `AI_PANEL_TAB` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `AI_SUGGESTED_PROMPT` | Prompt suggéré | `AI_PREFILL` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `AI_DOCUMENT_QUERY` | Question document | `AI_INPUT` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `AI_DOCUMENT_SEND` | Envoyer question document | `AI_QUERY` | `document_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-001 | `OPEN_RELATED_DOCUMENT` | Ouvrir document lié | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `DRAFT_QA_FROM_DOC` | Rédiger Q&R | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `FILTER_ISSUES` | Filtrer risques | `FILTER` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `CREATE_ISSUE` | Créer point de diligence | `CREATE_DRAFT` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `IMPORT_QA` | Importer questions | `IMPORT_REFERENCE` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `NEW_QA` | Nouvelle question | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `AI_ROOM_PROMPT` | Prompt VDR suggéré | `AI_PREFILL` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `AI_ROOM_QUERY` | Question VDR | `AI_INPUT` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `AI_ROOM_SEND` | Analyser VDR | `AI_QUERY` | `room_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-001 | `EXPORT_AUDIT` | Exporter journal | `EXPORT_REFERENCE` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-001 | `MANAGE_ACCESS` | Gérer accès | `OPEN_ACCESS_ADMIN` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `NAV_COCKPIT` | Cockpit | `SHOW_VIEW` | `cockpit` | VERIFIED | `VDR_UI_ACTION` |
| PT-002 | `NAV_DOCUMENTS` | Documents | `SHOW_VIEW` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `NAV_DEALLENS` | DealLens IA | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `NAV_QA` | Q&R | `SHOW_VIEW` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `NAV_ISSUES` | Risques | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `NAV_ENGAGEMENT` | Engagement | `SHOW_VIEW` | `engagement` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `NAV_AUDIT` | Audit | `SHOW_VIEW` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `NAV_ACCESS` | Accès | `SHOW_VIEW` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `GLOBAL_SEARCH` | Recherche globale | `FILTER_INPUT` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `SELECT_FOLDER` | Sélectionner un dossier | `SELECT_FOLDER` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `SELECT_DOCUMENT` | Sélectionner un document | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `EXPORT_SUMMARY` | Exporter la synthèse | `EXPORT_REFERENCE` | `cockpit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `OPEN_DEALLENS` | Interroger DealLens | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `OPEN_ISSUE_RADAR` | Ouvrir l’Issue Radar | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `COMPARE_VERSIONS` | Comparer versions | `OPEN_COMPARE` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `ADD_FAVORITE` | Ajouter aux favoris | `TOGGLE_FAVORITE` | `document` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `ZOOM_OUT` | Zoom - | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `ZOOM_LEVEL` | Niveau zoom | `VIEWER_STATUS` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `ZOOM_IN` | Zoom + | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `AI_TAB_SUMMARY` | Résumé IA | `AI_PANEL_TAB` | `summary` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `AI_TAB_FACTS` | Faits IA | `AI_PANEL_TAB` | `facts` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `AI_TAB_RISKS` | Risques IA | `AI_PANEL_TAB` | `risks` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `AI_TAB_COMPARE` | Comparer IA | `AI_PANEL_TAB` | `compare` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `AI_TAB_QA` | Q&R IA | `AI_PANEL_TAB` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `AI_SUGGESTED_PROMPT` | Prompt suggéré | `AI_PREFILL` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `AI_DOCUMENT_QUERY` | Question document | `AI_INPUT` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `AI_DOCUMENT_SEND` | Envoyer question document | `AI_QUERY` | `document_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-002 | `OPEN_RELATED_DOCUMENT` | Ouvrir document lié | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `DRAFT_QA_FROM_DOC` | Rédiger Q&R | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `FILTER_ISSUES` | Filtrer risques | `FILTER` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `CREATE_ISSUE` | Créer point de diligence | `CREATE_DRAFT` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `IMPORT_QA` | Importer questions | `IMPORT_REFERENCE` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `NEW_QA` | Nouvelle question | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `AI_ROOM_PROMPT` | Prompt VDR suggéré | `AI_PREFILL` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `AI_ROOM_QUERY` | Question VDR | `AI_INPUT` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `AI_ROOM_SEND` | Analyser VDR | `AI_QUERY` | `room_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-002 | `EXPORT_AUDIT` | Exporter journal | `EXPORT_REFERENCE` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-002 | `MANAGE_ACCESS` | Gérer accès | `OPEN_ACCESS_ADMIN` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `NAV_COCKPIT` | Cockpit | `SHOW_VIEW` | `cockpit` | VERIFIED | `VDR_UI_ACTION` |
| PT-003 | `NAV_DOCUMENTS` | Documents | `SHOW_VIEW` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `NAV_DEALLENS` | DealLens IA | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `NAV_QA` | Q&R | `SHOW_VIEW` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `NAV_ISSUES` | Risques | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `NAV_ENGAGEMENT` | Engagement | `SHOW_VIEW` | `engagement` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `NAV_AUDIT` | Audit | `SHOW_VIEW` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `NAV_ACCESS` | Accès | `SHOW_VIEW` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `GLOBAL_SEARCH` | Recherche globale | `FILTER_INPUT` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `SELECT_FOLDER` | Sélectionner un dossier | `SELECT_FOLDER` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `SELECT_DOCUMENT` | Sélectionner un document | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `EXPORT_SUMMARY` | Exporter la synthèse | `EXPORT_REFERENCE` | `cockpit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `OPEN_DEALLENS` | Interroger DealLens | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `OPEN_ISSUE_RADAR` | Ouvrir l’Issue Radar | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `COMPARE_VERSIONS` | Comparer versions | `OPEN_COMPARE` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `ADD_FAVORITE` | Ajouter aux favoris | `TOGGLE_FAVORITE` | `document` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `ZOOM_OUT` | Zoom - | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `ZOOM_LEVEL` | Niveau zoom | `VIEWER_STATUS` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `ZOOM_IN` | Zoom + | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `AI_TAB_SUMMARY` | Résumé IA | `AI_PANEL_TAB` | `summary` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `AI_TAB_FACTS` | Faits IA | `AI_PANEL_TAB` | `facts` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `AI_TAB_RISKS` | Risques IA | `AI_PANEL_TAB` | `risks` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `AI_TAB_COMPARE` | Comparer IA | `AI_PANEL_TAB` | `compare` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `AI_TAB_QA` | Q&R IA | `AI_PANEL_TAB` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `AI_SUGGESTED_PROMPT` | Prompt suggéré | `AI_PREFILL` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `AI_DOCUMENT_QUERY` | Question document | `AI_INPUT` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `AI_DOCUMENT_SEND` | Envoyer question document | `AI_QUERY` | `document_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-003 | `OPEN_RELATED_DOCUMENT` | Ouvrir document lié | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `DRAFT_QA_FROM_DOC` | Rédiger Q&R | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `FILTER_ISSUES` | Filtrer risques | `FILTER` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `CREATE_ISSUE` | Créer point de diligence | `CREATE_DRAFT` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `IMPORT_QA` | Importer questions | `IMPORT_REFERENCE` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `NEW_QA` | Nouvelle question | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `AI_ROOM_PROMPT` | Prompt VDR suggéré | `AI_PREFILL` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `AI_ROOM_QUERY` | Question VDR | `AI_INPUT` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `AI_ROOM_SEND` | Analyser VDR | `AI_QUERY` | `room_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-003 | `EXPORT_AUDIT` | Exporter journal | `EXPORT_REFERENCE` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-003 | `MANAGE_ACCESS` | Gérer accès | `OPEN_ACCESS_ADMIN` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `NAV_COCKPIT` | Cockpit | `SHOW_VIEW` | `cockpit` | VERIFIED | `VDR_UI_ACTION` |
| PT-004 | `NAV_DOCUMENTS` | Documents | `SHOW_VIEW` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `NAV_DEALLENS` | DealLens IA | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `NAV_QA` | Q&R | `SHOW_VIEW` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `NAV_ISSUES` | Risques | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `NAV_ENGAGEMENT` | Engagement | `SHOW_VIEW` | `engagement` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `NAV_AUDIT` | Audit | `SHOW_VIEW` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `NAV_ACCESS` | Accès | `SHOW_VIEW` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `GLOBAL_SEARCH` | Recherche globale | `FILTER_INPUT` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `SELECT_FOLDER` | Sélectionner un dossier | `SELECT_FOLDER` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `SELECT_DOCUMENT` | Sélectionner un document | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `EXPORT_SUMMARY` | Exporter la synthèse | `EXPORT_REFERENCE` | `cockpit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `OPEN_DEALLENS` | Interroger DealLens | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `OPEN_ISSUE_RADAR` | Ouvrir l’Issue Radar | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `COMPARE_VERSIONS` | Comparer versions | `OPEN_COMPARE` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `ADD_FAVORITE` | Ajouter aux favoris | `TOGGLE_FAVORITE` | `document` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `ZOOM_OUT` | Zoom - | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `ZOOM_LEVEL` | Niveau zoom | `VIEWER_STATUS` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `ZOOM_IN` | Zoom + | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `AI_TAB_SUMMARY` | Résumé IA | `AI_PANEL_TAB` | `summary` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `AI_TAB_FACTS` | Faits IA | `AI_PANEL_TAB` | `facts` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `AI_TAB_RISKS` | Risques IA | `AI_PANEL_TAB` | `risks` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `AI_TAB_COMPARE` | Comparer IA | `AI_PANEL_TAB` | `compare` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `AI_TAB_QA` | Q&R IA | `AI_PANEL_TAB` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `AI_SUGGESTED_PROMPT` | Prompt suggéré | `AI_PREFILL` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `AI_DOCUMENT_QUERY` | Question document | `AI_INPUT` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `AI_DOCUMENT_SEND` | Envoyer question document | `AI_QUERY` | `document_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-004 | `OPEN_RELATED_DOCUMENT` | Ouvrir document lié | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `DRAFT_QA_FROM_DOC` | Rédiger Q&R | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `FILTER_ISSUES` | Filtrer risques | `FILTER` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `CREATE_ISSUE` | Créer point de diligence | `CREATE_DRAFT` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `IMPORT_QA` | Importer questions | `IMPORT_REFERENCE` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `NEW_QA` | Nouvelle question | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `AI_ROOM_PROMPT` | Prompt VDR suggéré | `AI_PREFILL` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `AI_ROOM_QUERY` | Question VDR | `AI_INPUT` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `AI_ROOM_SEND` | Analyser VDR | `AI_QUERY` | `room_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-004 | `EXPORT_AUDIT` | Exporter journal | `EXPORT_REFERENCE` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-004 | `MANAGE_ACCESS` | Gérer accès | `OPEN_ACCESS_ADMIN` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `NAV_COCKPIT` | Cockpit | `SHOW_VIEW` | `cockpit` | VERIFIED | `VDR_UI_ACTION` |
| PT-005 | `NAV_DOCUMENTS` | Documents | `SHOW_VIEW` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `NAV_DEALLENS` | DealLens IA | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `NAV_QA` | Q&R | `SHOW_VIEW` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `NAV_ISSUES` | Risques | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `NAV_ENGAGEMENT` | Engagement | `SHOW_VIEW` | `engagement` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `NAV_AUDIT` | Audit | `SHOW_VIEW` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `NAV_ACCESS` | Accès | `SHOW_VIEW` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `GLOBAL_SEARCH` | Recherche globale | `FILTER_INPUT` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `SELECT_FOLDER` | Sélectionner un dossier | `SELECT_FOLDER` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `SELECT_DOCUMENT` | Sélectionner un document | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `EXPORT_SUMMARY` | Exporter la synthèse | `EXPORT_REFERENCE` | `cockpit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `OPEN_DEALLENS` | Interroger DealLens | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `OPEN_ISSUE_RADAR` | Ouvrir l’Issue Radar | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `COMPARE_VERSIONS` | Comparer versions | `OPEN_COMPARE` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `ADD_FAVORITE` | Ajouter aux favoris | `TOGGLE_FAVORITE` | `document` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `ZOOM_OUT` | Zoom - | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `ZOOM_LEVEL` | Niveau zoom | `VIEWER_STATUS` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `ZOOM_IN` | Zoom + | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `AI_TAB_SUMMARY` | Résumé IA | `AI_PANEL_TAB` | `summary` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `AI_TAB_FACTS` | Faits IA | `AI_PANEL_TAB` | `facts` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `AI_TAB_RISKS` | Risques IA | `AI_PANEL_TAB` | `risks` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `AI_TAB_COMPARE` | Comparer IA | `AI_PANEL_TAB` | `compare` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `AI_TAB_QA` | Q&R IA | `AI_PANEL_TAB` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `AI_SUGGESTED_PROMPT` | Prompt suggéré | `AI_PREFILL` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `AI_DOCUMENT_QUERY` | Question document | `AI_INPUT` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `AI_DOCUMENT_SEND` | Envoyer question document | `AI_QUERY` | `document_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-005 | `OPEN_RELATED_DOCUMENT` | Ouvrir document lié | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `DRAFT_QA_FROM_DOC` | Rédiger Q&R | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `FILTER_ISSUES` | Filtrer risques | `FILTER` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `CREATE_ISSUE` | Créer point de diligence | `CREATE_DRAFT` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `IMPORT_QA` | Importer questions | `IMPORT_REFERENCE` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `NEW_QA` | Nouvelle question | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `AI_ROOM_PROMPT` | Prompt VDR suggéré | `AI_PREFILL` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `AI_ROOM_QUERY` | Question VDR | `AI_INPUT` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `AI_ROOM_SEND` | Analyser VDR | `AI_QUERY` | `room_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-005 | `EXPORT_AUDIT` | Exporter journal | `EXPORT_REFERENCE` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-005 | `MANAGE_ACCESS` | Gérer accès | `OPEN_ACCESS_ADMIN` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `NAV_COCKPIT` | Cockpit | `SHOW_VIEW` | `cockpit` | VERIFIED | `VDR_UI_ACTION` |
| PT-006 | `NAV_DOCUMENTS` | Documents | `SHOW_VIEW` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `NAV_DEALLENS` | DealLens IA | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `NAV_QA` | Q&R | `SHOW_VIEW` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `NAV_ISSUES` | Risques | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `NAV_ENGAGEMENT` | Engagement | `SHOW_VIEW` | `engagement` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `NAV_AUDIT` | Audit | `SHOW_VIEW` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `NAV_ACCESS` | Accès | `SHOW_VIEW` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `GLOBAL_SEARCH` | Recherche globale | `FILTER_INPUT` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `SELECT_FOLDER` | Sélectionner un dossier | `SELECT_FOLDER` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `SELECT_DOCUMENT` | Sélectionner un document | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `EXPORT_SUMMARY` | Exporter la synthèse | `EXPORT_REFERENCE` | `cockpit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `OPEN_DEALLENS` | Interroger DealLens | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `OPEN_ISSUE_RADAR` | Ouvrir l’Issue Radar | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `COMPARE_VERSIONS` | Comparer versions | `OPEN_COMPARE` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `ADD_FAVORITE` | Ajouter aux favoris | `TOGGLE_FAVORITE` | `document` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `ZOOM_OUT` | Zoom - | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `ZOOM_LEVEL` | Niveau zoom | `VIEWER_STATUS` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `ZOOM_IN` | Zoom + | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `AI_TAB_SUMMARY` | Résumé IA | `AI_PANEL_TAB` | `summary` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `AI_TAB_FACTS` | Faits IA | `AI_PANEL_TAB` | `facts` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `AI_TAB_RISKS` | Risques IA | `AI_PANEL_TAB` | `risks` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `AI_TAB_COMPARE` | Comparer IA | `AI_PANEL_TAB` | `compare` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `AI_TAB_QA` | Q&R IA | `AI_PANEL_TAB` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `AI_SUGGESTED_PROMPT` | Prompt suggéré | `AI_PREFILL` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `AI_DOCUMENT_QUERY` | Question document | `AI_INPUT` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `AI_DOCUMENT_SEND` | Envoyer question document | `AI_QUERY` | `document_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-006 | `OPEN_RELATED_DOCUMENT` | Ouvrir document lié | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `DRAFT_QA_FROM_DOC` | Rédiger Q&R | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `FILTER_ISSUES` | Filtrer risques | `FILTER` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `CREATE_ISSUE` | Créer point de diligence | `CREATE_DRAFT` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `IMPORT_QA` | Importer questions | `IMPORT_REFERENCE` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `NEW_QA` | Nouvelle question | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `AI_ROOM_PROMPT` | Prompt VDR suggéré | `AI_PREFILL` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `AI_ROOM_QUERY` | Question VDR | `AI_INPUT` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `AI_ROOM_SEND` | Analyser VDR | `AI_QUERY` | `room_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-006 | `EXPORT_AUDIT` | Exporter journal | `EXPORT_REFERENCE` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-006 | `MANAGE_ACCESS` | Gérer accès | `OPEN_ACCESS_ADMIN` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `NAV_COCKPIT` | Cockpit | `SHOW_VIEW` | `cockpit` | VERIFIED | `VDR_UI_ACTION` |
| PT-007 | `NAV_DOCUMENTS` | Documents | `SHOW_VIEW` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `NAV_DEALLENS` | DealLens IA | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `NAV_QA` | Q&R | `SHOW_VIEW` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `NAV_ISSUES` | Risques | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `NAV_ENGAGEMENT` | Engagement | `SHOW_VIEW` | `engagement` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `NAV_AUDIT` | Audit | `SHOW_VIEW` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `NAV_ACCESS` | Accès | `SHOW_VIEW` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `GLOBAL_SEARCH` | Recherche globale | `FILTER_INPUT` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `SELECT_FOLDER` | Sélectionner un dossier | `SELECT_FOLDER` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `SELECT_DOCUMENT` | Sélectionner un document | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `EXPORT_SUMMARY` | Exporter la synthèse | `EXPORT_REFERENCE` | `cockpit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `OPEN_DEALLENS` | Interroger DealLens | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `OPEN_ISSUE_RADAR` | Ouvrir l’Issue Radar | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `COMPARE_VERSIONS` | Comparer versions | `OPEN_COMPARE` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `ADD_FAVORITE` | Ajouter aux favoris | `TOGGLE_FAVORITE` | `document` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `ZOOM_OUT` | Zoom - | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `ZOOM_LEVEL` | Niveau zoom | `VIEWER_STATUS` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `ZOOM_IN` | Zoom + | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `AI_TAB_SUMMARY` | Résumé IA | `AI_PANEL_TAB` | `summary` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `AI_TAB_FACTS` | Faits IA | `AI_PANEL_TAB` | `facts` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `AI_TAB_RISKS` | Risques IA | `AI_PANEL_TAB` | `risks` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `AI_TAB_COMPARE` | Comparer IA | `AI_PANEL_TAB` | `compare` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `AI_TAB_QA` | Q&R IA | `AI_PANEL_TAB` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `AI_SUGGESTED_PROMPT` | Prompt suggéré | `AI_PREFILL` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `AI_DOCUMENT_QUERY` | Question document | `AI_INPUT` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `AI_DOCUMENT_SEND` | Envoyer question document | `AI_QUERY` | `document_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-007 | `OPEN_RELATED_DOCUMENT` | Ouvrir document lié | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `DRAFT_QA_FROM_DOC` | Rédiger Q&R | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `FILTER_ISSUES` | Filtrer risques | `FILTER` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `CREATE_ISSUE` | Créer point de diligence | `CREATE_DRAFT` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `IMPORT_QA` | Importer questions | `IMPORT_REFERENCE` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `NEW_QA` | Nouvelle question | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `AI_ROOM_PROMPT` | Prompt VDR suggéré | `AI_PREFILL` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `AI_ROOM_QUERY` | Question VDR | `AI_INPUT` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `AI_ROOM_SEND` | Analyser VDR | `AI_QUERY` | `room_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-007 | `EXPORT_AUDIT` | Exporter journal | `EXPORT_REFERENCE` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-007 | `MANAGE_ACCESS` | Gérer accès | `OPEN_ACCESS_ADMIN` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `NAV_COCKPIT` | Cockpit | `SHOW_VIEW` | `cockpit` | VERIFIED | `VDR_UI_ACTION` |
| PT-008 | `NAV_DOCUMENTS` | Documents | `SHOW_VIEW` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `NAV_DEALLENS` | DealLens IA | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `NAV_QA` | Q&R | `SHOW_VIEW` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `NAV_ISSUES` | Risques | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `NAV_ENGAGEMENT` | Engagement | `SHOW_VIEW` | `engagement` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `NAV_AUDIT` | Audit | `SHOW_VIEW` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `NAV_ACCESS` | Accès | `SHOW_VIEW` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `GLOBAL_SEARCH` | Recherche globale | `FILTER_INPUT` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `SELECT_FOLDER` | Sélectionner un dossier | `SELECT_FOLDER` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `SELECT_DOCUMENT` | Sélectionner un document | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `EXPORT_SUMMARY` | Exporter la synthèse | `EXPORT_REFERENCE` | `cockpit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `OPEN_DEALLENS` | Interroger DealLens | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `OPEN_ISSUE_RADAR` | Ouvrir l’Issue Radar | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `COMPARE_VERSIONS` | Comparer versions | `OPEN_COMPARE` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `ADD_FAVORITE` | Ajouter aux favoris | `TOGGLE_FAVORITE` | `document` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `ZOOM_OUT` | Zoom - | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `ZOOM_LEVEL` | Niveau zoom | `VIEWER_STATUS` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `ZOOM_IN` | Zoom + | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `AI_TAB_SUMMARY` | Résumé IA | `AI_PANEL_TAB` | `summary` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `AI_TAB_FACTS` | Faits IA | `AI_PANEL_TAB` | `facts` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `AI_TAB_RISKS` | Risques IA | `AI_PANEL_TAB` | `risks` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `AI_TAB_COMPARE` | Comparer IA | `AI_PANEL_TAB` | `compare` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `AI_TAB_QA` | Q&R IA | `AI_PANEL_TAB` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `AI_SUGGESTED_PROMPT` | Prompt suggéré | `AI_PREFILL` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `AI_DOCUMENT_QUERY` | Question document | `AI_INPUT` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `AI_DOCUMENT_SEND` | Envoyer question document | `AI_QUERY` | `document_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-008 | `OPEN_RELATED_DOCUMENT` | Ouvrir document lié | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `DRAFT_QA_FROM_DOC` | Rédiger Q&R | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `FILTER_ISSUES` | Filtrer risques | `FILTER` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `CREATE_ISSUE` | Créer point de diligence | `CREATE_DRAFT` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `IMPORT_QA` | Importer questions | `IMPORT_REFERENCE` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `NEW_QA` | Nouvelle question | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `AI_ROOM_PROMPT` | Prompt VDR suggéré | `AI_PREFILL` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `AI_ROOM_QUERY` | Question VDR | `AI_INPUT` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `AI_ROOM_SEND` | Analyser VDR | `AI_QUERY` | `room_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-008 | `EXPORT_AUDIT` | Exporter journal | `EXPORT_REFERENCE` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-008 | `MANAGE_ACCESS` | Gérer accès | `OPEN_ACCESS_ADMIN` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `NAV_COCKPIT` | Cockpit | `SHOW_VIEW` | `cockpit` | VERIFIED | `VDR_UI_ACTION` |
| PT-009 | `NAV_DOCUMENTS` | Documents | `SHOW_VIEW` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `NAV_DEALLENS` | DealLens IA | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `NAV_QA` | Q&R | `SHOW_VIEW` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `NAV_ISSUES` | Risques | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `NAV_ENGAGEMENT` | Engagement | `SHOW_VIEW` | `engagement` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `NAV_AUDIT` | Audit | `SHOW_VIEW` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `NAV_ACCESS` | Accès | `SHOW_VIEW` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `GLOBAL_SEARCH` | Recherche globale | `FILTER_INPUT` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `SELECT_FOLDER` | Sélectionner un dossier | `SELECT_FOLDER` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `SELECT_DOCUMENT` | Sélectionner un document | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `EXPORT_SUMMARY` | Exporter la synthèse | `EXPORT_REFERENCE` | `cockpit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `OPEN_DEALLENS` | Interroger DealLens | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `OPEN_ISSUE_RADAR` | Ouvrir l’Issue Radar | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `COMPARE_VERSIONS` | Comparer versions | `OPEN_COMPARE` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `ADD_FAVORITE` | Ajouter aux favoris | `TOGGLE_FAVORITE` | `document` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `ZOOM_OUT` | Zoom - | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `ZOOM_LEVEL` | Niveau zoom | `VIEWER_STATUS` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `ZOOM_IN` | Zoom + | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `AI_TAB_SUMMARY` | Résumé IA | `AI_PANEL_TAB` | `summary` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `AI_TAB_FACTS` | Faits IA | `AI_PANEL_TAB` | `facts` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `AI_TAB_RISKS` | Risques IA | `AI_PANEL_TAB` | `risks` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `AI_TAB_COMPARE` | Comparer IA | `AI_PANEL_TAB` | `compare` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `AI_TAB_QA` | Q&R IA | `AI_PANEL_TAB` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `AI_SUGGESTED_PROMPT` | Prompt suggéré | `AI_PREFILL` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `AI_DOCUMENT_QUERY` | Question document | `AI_INPUT` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `AI_DOCUMENT_SEND` | Envoyer question document | `AI_QUERY` | `document_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-009 | `OPEN_RELATED_DOCUMENT` | Ouvrir document lié | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `DRAFT_QA_FROM_DOC` | Rédiger Q&R | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `FILTER_ISSUES` | Filtrer risques | `FILTER` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `CREATE_ISSUE` | Créer point de diligence | `CREATE_DRAFT` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `IMPORT_QA` | Importer questions | `IMPORT_REFERENCE` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `NEW_QA` | Nouvelle question | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `AI_ROOM_PROMPT` | Prompt VDR suggéré | `AI_PREFILL` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `AI_ROOM_QUERY` | Question VDR | `AI_INPUT` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `AI_ROOM_SEND` | Analyser VDR | `AI_QUERY` | `room_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-009 | `EXPORT_AUDIT` | Exporter journal | `EXPORT_REFERENCE` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-009 | `MANAGE_ACCESS` | Gérer accès | `OPEN_ACCESS_ADMIN` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `NAV_COCKPIT` | Cockpit | `SHOW_VIEW` | `cockpit` | VERIFIED | `VDR_UI_ACTION` |
| PT-010 | `NAV_DOCUMENTS` | Documents | `SHOW_VIEW` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `NAV_DEALLENS` | DealLens IA | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `NAV_QA` | Q&R | `SHOW_VIEW` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `NAV_ISSUES` | Risques | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `NAV_ENGAGEMENT` | Engagement | `SHOW_VIEW` | `engagement` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `NAV_AUDIT` | Audit | `SHOW_VIEW` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `NAV_ACCESS` | Accès | `SHOW_VIEW` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `GLOBAL_SEARCH` | Recherche globale | `FILTER_INPUT` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `SELECT_FOLDER` | Sélectionner un dossier | `SELECT_FOLDER` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `SELECT_DOCUMENT` | Sélectionner un document | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `EXPORT_SUMMARY` | Exporter la synthèse | `EXPORT_REFERENCE` | `cockpit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `OPEN_DEALLENS` | Interroger DealLens | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `OPEN_ISSUE_RADAR` | Ouvrir l’Issue Radar | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `COMPARE_VERSIONS` | Comparer versions | `OPEN_COMPARE` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `ADD_FAVORITE` | Ajouter aux favoris | `TOGGLE_FAVORITE` | `document` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `ZOOM_OUT` | Zoom - | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `ZOOM_LEVEL` | Niveau zoom | `VIEWER_STATUS` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `ZOOM_IN` | Zoom + | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `AI_TAB_SUMMARY` | Résumé IA | `AI_PANEL_TAB` | `summary` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `AI_TAB_FACTS` | Faits IA | `AI_PANEL_TAB` | `facts` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `AI_TAB_RISKS` | Risques IA | `AI_PANEL_TAB` | `risks` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `AI_TAB_COMPARE` | Comparer IA | `AI_PANEL_TAB` | `compare` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `AI_TAB_QA` | Q&R IA | `AI_PANEL_TAB` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `AI_SUGGESTED_PROMPT` | Prompt suggéré | `AI_PREFILL` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `AI_DOCUMENT_QUERY` | Question document | `AI_INPUT` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `AI_DOCUMENT_SEND` | Envoyer question document | `AI_QUERY` | `document_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-010 | `OPEN_RELATED_DOCUMENT` | Ouvrir document lié | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `DRAFT_QA_FROM_DOC` | Rédiger Q&R | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `FILTER_ISSUES` | Filtrer risques | `FILTER` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `CREATE_ISSUE` | Créer point de diligence | `CREATE_DRAFT` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `IMPORT_QA` | Importer questions | `IMPORT_REFERENCE` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `NEW_QA` | Nouvelle question | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `AI_ROOM_PROMPT` | Prompt VDR suggéré | `AI_PREFILL` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `AI_ROOM_QUERY` | Question VDR | `AI_INPUT` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `AI_ROOM_SEND` | Analyser VDR | `AI_QUERY` | `room_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-010 | `EXPORT_AUDIT` | Exporter journal | `EXPORT_REFERENCE` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-010 | `MANAGE_ACCESS` | Gérer accès | `OPEN_ACCESS_ADMIN` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `NAV_COCKPIT` | Cockpit | `SHOW_VIEW` | `cockpit` | VERIFIED | `VDR_UI_ACTION` |
| PT-011 | `NAV_DOCUMENTS` | Documents | `SHOW_VIEW` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `NAV_DEALLENS` | DealLens IA | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `NAV_QA` | Q&R | `SHOW_VIEW` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `NAV_ISSUES` | Risques | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `NAV_ENGAGEMENT` | Engagement | `SHOW_VIEW` | `engagement` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `NAV_AUDIT` | Audit | `SHOW_VIEW` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `NAV_ACCESS` | Accès | `SHOW_VIEW` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `GLOBAL_SEARCH` | Recherche globale | `FILTER_INPUT` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `SELECT_FOLDER` | Sélectionner un dossier | `SELECT_FOLDER` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `SELECT_DOCUMENT` | Sélectionner un document | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `EXPORT_SUMMARY` | Exporter la synthèse | `EXPORT_REFERENCE` | `cockpit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `OPEN_DEALLENS` | Interroger DealLens | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `OPEN_ISSUE_RADAR` | Ouvrir l’Issue Radar | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `COMPARE_VERSIONS` | Comparer versions | `OPEN_COMPARE` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `ADD_FAVORITE` | Ajouter aux favoris | `TOGGLE_FAVORITE` | `document` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `ZOOM_OUT` | Zoom - | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `ZOOM_LEVEL` | Niveau zoom | `VIEWER_STATUS` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `ZOOM_IN` | Zoom + | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `AI_TAB_SUMMARY` | Résumé IA | `AI_PANEL_TAB` | `summary` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `AI_TAB_FACTS` | Faits IA | `AI_PANEL_TAB` | `facts` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `AI_TAB_RISKS` | Risques IA | `AI_PANEL_TAB` | `risks` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `AI_TAB_COMPARE` | Comparer IA | `AI_PANEL_TAB` | `compare` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `AI_TAB_QA` | Q&R IA | `AI_PANEL_TAB` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `AI_SUGGESTED_PROMPT` | Prompt suggéré | `AI_PREFILL` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `AI_DOCUMENT_QUERY` | Question document | `AI_INPUT` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `AI_DOCUMENT_SEND` | Envoyer question document | `AI_QUERY` | `document_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-011 | `OPEN_RELATED_DOCUMENT` | Ouvrir document lié | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `DRAFT_QA_FROM_DOC` | Rédiger Q&R | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `FILTER_ISSUES` | Filtrer risques | `FILTER` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `CREATE_ISSUE` | Créer point de diligence | `CREATE_DRAFT` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `IMPORT_QA` | Importer questions | `IMPORT_REFERENCE` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `NEW_QA` | Nouvelle question | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `AI_ROOM_PROMPT` | Prompt VDR suggéré | `AI_PREFILL` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `AI_ROOM_QUERY` | Question VDR | `AI_INPUT` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `AI_ROOM_SEND` | Analyser VDR | `AI_QUERY` | `room_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-011 | `EXPORT_AUDIT` | Exporter journal | `EXPORT_REFERENCE` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-011 | `MANAGE_ACCESS` | Gérer accès | `OPEN_ACCESS_ADMIN` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `NAV_COCKPIT` | Cockpit | `SHOW_VIEW` | `cockpit` | VERIFIED | `VDR_UI_ACTION` |
| PT-012 | `NAV_DOCUMENTS` | Documents | `SHOW_VIEW` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `NAV_DEALLENS` | DealLens IA | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `NAV_QA` | Q&R | `SHOW_VIEW` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `NAV_ISSUES` | Risques | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `NAV_ENGAGEMENT` | Engagement | `SHOW_VIEW` | `engagement` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `NAV_AUDIT` | Audit | `SHOW_VIEW` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `NAV_ACCESS` | Accès | `SHOW_VIEW` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `GLOBAL_SEARCH` | Recherche globale | `FILTER_INPUT` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `SELECT_FOLDER` | Sélectionner un dossier | `SELECT_FOLDER` | `documents` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `SELECT_DOCUMENT` | Sélectionner un document | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `EXPORT_SUMMARY` | Exporter la synthèse | `EXPORT_REFERENCE` | `cockpit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `OPEN_DEALLENS` | Interroger DealLens | `SHOW_VIEW` | `deallens` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `OPEN_ISSUE_RADAR` | Ouvrir l’Issue Radar | `SHOW_VIEW` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `COMPARE_VERSIONS` | Comparer versions | `OPEN_COMPARE` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `ADD_FAVORITE` | Ajouter aux favoris | `TOGGLE_FAVORITE` | `document` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `ZOOM_OUT` | Zoom - | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `ZOOM_LEVEL` | Niveau zoom | `VIEWER_STATUS` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `ZOOM_IN` | Zoom + | `VIEWER_ZOOM` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `AI_TAB_SUMMARY` | Résumé IA | `AI_PANEL_TAB` | `summary` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `AI_TAB_FACTS` | Faits IA | `AI_PANEL_TAB` | `facts` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `AI_TAB_RISKS` | Risques IA | `AI_PANEL_TAB` | `risks` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `AI_TAB_COMPARE` | Comparer IA | `AI_PANEL_TAB` | `compare` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `AI_TAB_QA` | Q&R IA | `AI_PANEL_TAB` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `AI_SUGGESTED_PROMPT` | Prompt suggéré | `AI_PREFILL` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `AI_DOCUMENT_QUERY` | Question document | `AI_INPUT` | `document_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `AI_DOCUMENT_SEND` | Envoyer question document | `AI_QUERY` | `document_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-012 | `OPEN_RELATED_DOCUMENT` | Ouvrir document lié | `SELECT_DOCUMENT` | `document_viewer` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `DRAFT_QA_FROM_DOC` | Rédiger Q&R | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `FILTER_ISSUES` | Filtrer risques | `FILTER` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `CREATE_ISSUE` | Créer point de diligence | `CREATE_DRAFT` | `issues` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `IMPORT_QA` | Importer questions | `IMPORT_REFERENCE` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `NEW_QA` | Nouvelle question | `CREATE_QA_DRAFT` | `qa` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `AI_ROOM_PROMPT` | Prompt VDR suggéré | `AI_PREFILL` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `AI_ROOM_QUERY` | Question VDR | `AI_INPUT` | `room_query` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `AI_ROOM_SEND` | Analyser VDR | `AI_QUERY` | `room_answer` | AUTHORIZED | `AI_QUERY_COMPLETED` |
| PT-012 | `EXPORT_AUDIT` | Exporter journal | `EXPORT_REFERENCE` | `audit` | AUTHORIZED | `VDR_UI_ACTION` |
| PT-012 | `MANAGE_ACCESS` | Gérer accès | `OPEN_ACCESS_ADMIN` | `access` | AUTHORIZED | `VDR_UI_ACTION` |
