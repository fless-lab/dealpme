# Frontend : organisation et design system

## Une application, plusieurs espaces

`codebases/frontend/web` est une seule application Next.js (App Router). Elle sert tous les espaces par groupes de
routes, avec une seule session, une seule navigation adaptée au rôle et un seul design system :

```
app/
  (public)/            site vitrine, marketplace T0, connexion, inscription, vérification d'email, second facteur
  (espace)/cedant/     espace cédant : liste des dossiers, assistant en cinq étapes, récapitulatif, historique
  (espace)/investisseur/ opportunités, thèse, demandes d'accès, deals
  (espace)/cci/        console CCI-Togo : tableau de bord agrégé, adhésions, entreprises, journal des certifications
  (espace)/conformite/ admissions, compteurs de divulgation, blocages (V2)
  (espace)/admin/      opérations, drapeaux, incidents (V3)
  (dataroom)/          poste de travail data room et VDR Intelligence (V2, V5)
  compte/              page Compte : identité, rôle, appareils connectés, révocation à distance
  labo/                laboratoire de composants : toutes les variantes et tous les états du design system
  api/auth/[action]    BFF : connexion, second facteur, inscription, vérification d'email, déconnexion
  api/sessions/[id]    BFF : révocation d'un appareil
  api/institution/     BFF de la console CCI-Togo, sur liste blanche d'actions
  api/dossier/         BFF du dossier cédant : valeurs déclarées, dépôt et lecture des pièces
```

Le navigateur ne parle qu'au BFF (`app/api/`). Le jeton de session API est posé dans un cookie `dp_session` httpOnly,
SameSite=Lax, Secure en production ; il n'est jamais exposé au JavaScript de la page. Les composants serveur lisent
le cookie (`lib/session.ts`) et appellent l'API avec `Authorization: Bearer`. Les codes d'erreur de l'API sont
conservés et traduits en messages français dans `lib/api.ts` (`messageFor`).

Espaces par rôle : la navigation dépend des rôles renvoyés par `/me`, mais elle n'est jamais la frontière de
sécurité ; chaque page d'espace vérifie la session côté serveur (`lib/guards.ts`, `requireRole`) et l'API refuse de
toute façon un rôle non autorisé. Un rôle insuffisant renvoie vers l'accueil plutôt que vers une page d'erreur, pour
ne pas révéler l'existence de l'espace.

Les routes `api/` qui relaient des actions vers l'API portent une liste blanche explicite : elles ne sont jamais un
proxy générique. Le relais échange le cookie contre un appel authentifié, rien de plus ; l'autorisation reste
évaluée côté API.

Pourquoi une seule application et non plusieurs : une session et une authentification, un design system, une
navigation par rôle, un déploiement pendant le pilote (2 000 comptes). Si la console CCI-Togo doit un jour être
déployée séparément, Next.js permet d'extraire un groupe de routes en zone distincte sans réécriture.

Le site public de marque (prototype `DealPME_7_Services_Enterprise_Redesign`) reste un chantier à part : il suit la
charte de marque, pas le design system produit.

## Design system : `@dealpme/ui`

Source de vérité : `design/` (extrait par `devX/open_design.sh`, ignoré par git) : Enterprise Design System v1.0
(jetons `dealpme.tokens.json`, catalogue de 94 écrans), Tranche 3 (23 composants nommés, matrice de variantes et
d'états, responsive, mouvement, accessibilité, mapping React), cas d'or PT-001 (14 écrans HTML et PNG, autorité visuelle).

| Fichier | Contenu |
|---|---|
| `src/tokens.ts`, `src/tokens.css` | couleurs, typographies (Inter interface, Barlow Condensed titres), espacement 4 à 80, rayons, mouvement (six patrons), points de rupture |
| `src/types.ts` | contrats de données des composants (Permission Lens, preuve, risque, réponse DealLens, document, fil Q&R) |
| `src/primitives.tsx` | Button (primary, secondary, danger, ghost ; default, loading, blocked), Field, Input, Select, Textarea, Checkbox, StatusBadge, Badge, Panel, Skeleton, Toast |
| `src/layout.tsx` | AppShell, ContextBar, Workspace, TransactionNav, ServiceNav |
| `src/trust.tsx` | StateBanner, WarningStrip, PartnerResponsibilityStrip, PermissionLens, TransactionRail, EvidenceStrip, DecisionGate |
| `src/data.tsx` | Metric, FinancialTable, DealRow, CriteriaMatrix, ReadinessPanel, CoverageRow, IssueRow, RiskImpactCard |
| `src/vdr.tsx` | VDRFolder, DocumentRow, SecureViewer, DealLensAnswer, DealLensPanel, EvidenceNode, QnAThread, MiniDocument |

Le paquet est consommé depuis ses sources (`main: src/index.ts`, `transpilePackages` dans `next.config.ts`), sans
étape de compilation : c'est la condition pour que les directives `"use client"` des modules interactifs
(`primitives`, `layout`, `vdr`) soient respectées par le rendu serveur de Next. `trust` et `data` restent des
composants serveur. `npm run typecheck -w codebases/frontend/ui` vérifie le paquet.

Règles (guides Tranche 3) : composants partagés avec variantes explicites, jamais de copie du HTML de référence ;
chaque contrôle visible porte un `data-control-id` du registre d'interactions ; le client affiche les permissions
et ne les calcule jamais ; `FORBIDDEN`, `PERIMETER_BLOCKED`, `NOT_FOUND` et `INVALID_TRANSITION` restent des états
distincts ; tables et rails avant grilles de cartes ; aucune page ne défile horizontalement ; cibles tactiles 44 px ;
`prefers-reduced-motion` respecté ; WCAG 2.2 AA visé.

Une surface est terminée quand ses états par défaut, rempli, chargement, vide, erreur de validation, permission refusée,
blocage réglementaire, responsive et accessibilité sont spécifiés et testés.

## Palette : produit ou marque

La charte de marque (Marine Encre `#1C2751`, Bleu Signal `#6678F1`, Barlow) et le design system produit (Marine
`#0B2B52`, Signal `#1769E8`, Inter) ne sont pas identiques. L'application suit le design system produit, parce que
c'est contre lui que les écrans sont acceptés (PT-001 = autorité visuelle) ; la charte régit le site public et
l'imprimé. Décision A09 du classeur, à confirmer avec le designer UI/UX dès sa nomination.

## Revue visuelle

Le laboratoire de composants (`/labo`) affiche chaque composant dans toutes ses variantes et tous ses états, sur les
données de démonstration. C'est la surface de revue du designer et la référence des captures de régression visuelle
(1440 x 960 et 390 x 844). Un Storybook peut être ajouté lorsque le designer rejoint le projet ; le laboratoire en
tient lieu d'ici là sans dépendance supplémentaire.
