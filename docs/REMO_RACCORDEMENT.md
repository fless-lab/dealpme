# Remo piloté depuis DealPME — adaptateur API et SAML

## Livré et vérifié hors compte fournisseur

Le Swagger public est archivé dans `codebases/external_connectors/remo/contracts/`, avec URL source,
date et empreintes. Les emails/tokens des exemples publics sont neutralisés ; les schémas et opérations
restent ceux du fournisseur. Actualisation explicite : `node devX/fetch-remo-contract.mjs`.

Le connecteur implémente les opérations utilisées par DealPME avec `Authorization: Token: <App Token>` :
création sous un Company ID explicite, lecture, modification de contenu, suppression, invitation de
membres, liste/présence, association aux groupes existants. Découverte paginée et rapport de présence
par hôte sont disponibles dans le connecteur ; leur exploitation statistique approfondie reste au lot P20.
La création via la compagnie principale implicite n'est pas utilisée : chaque événement est rattaché
à un compte/Company ID explicite. Aucun endpoint SSO, de marque blanche globale ou de téléchargement
de recordings n'est inventé à partir des seuls schémas de données.

Les essais exécutent le **vrai adaptateur** contre un serveur de contrat HTTPS local. Le SSO est signé
et vérifié par une implémentation SAML côté service destinataire, y compris dans un navigateur.
Cela valide le code et son raccordement ; la recette avec les droits et données du compte Remo demeure
une étape distincte à réaliser dès réception des accès.

La revue de câblage V1-110 et le précontrôle/bascule V1-111 sont éprouvés, avec leurs compléments
V1-117/118/119. La matrice couvre 27 routes ; la suite Remo comporte 24 scénarios de contrat, dont
neuf consacrés à cette revue. V1-112 à 115 portent l'activation et les recettes réelles ; V1-116 clôt
L05 après corrections et qualification V1-107. Voir [PLAN_EXECUTION.md](PLAN_EXECUTION.md).

## Écrans

- `/organisateur/integration` : compte configuré, quota/référence, profil général versionné, paramètres
  SAML publics et export des métadonnées. Aucune clé API/clé privée ne quitte le serveur.
- `/organisateur/evenements` et ses fiches : préparer/publier, rapprocher une création, modifier le
  contenu et les visuels d'un événement publié, synchroniser invitations/présences et gérer les groupes.
- `/evenements` : inscription avec accord de transmission d'email à Remo, distinct du partage de contacts.
- `/diaspora` : demande privée, même accord fournisseur, confirmation humaine et accès à la salle.

Les listes organisateur et diaspora sont paginées (50 lignes par défaut, maximum 100 par appel API),
par curseur date/identifiant conservant la précision PostgreSQL. Les deux listes de la console ont des
curseurs indépendants ; les erreurs de chargement sont visibles. Une demande diaspora conserve sa clé
au réessai : même utilisateur/contenu donne la même demande, un contenu différent est refusé. Une décision
déjà enregistrée peut être relue avec le même officier et le même motif.

Le profil général DealPME est modifiable par `PLATFORM_ADMIN` ; les organisateurs peuvent le consulter
et le reprendre dans leurs événements. Les surcharges événementielles ne modifient pas ce profil.
Les valeurs héritées sont figées avec leur version ; les événements déjà préparés/publiés restent intacts.

## Correspondance des visuels

| Champ DealPME | Champ Remo | Portée |
|---|---|---|
| Logo de marque | `eventBrandingLogoURL`, `isEventBrandingEnabled` | Événement |
| Couverture | `logoURL` | Visuel de l'événement, distinct du logo de marque |
| Image et texte d'accueil | `welcomeMessage`, `isTextDefault`, `isMediaDefault` | Événement ; média requis par le schéma |
| Accent couleur | Aucun champ équivalent documenté | DealPME / simulateur |

Les champs de visuels acceptent des **URL HTTPS publiques et stables**. Il ne s'agit pas d'un dépôt
de fichiers ni d'un générateur de favicon. Sans média d'accueil, Remo reprend son accueil général.
Le domaine personnalisé, le favicon, le fond de connexion et les emails globaux sont des réglages
initiaux du compte fournisseur : le Swagger ne publie pas d'opération permettant de les écrire.
Ils restent à activer dans le compte Remo, puis à vérifier sur les parcours issus de DealPME.

## Création, reprise et suppression

Le registre persiste compte/Company ID, produit, créneau et réservation avant le POST de création.
Un code `dealpme-<publicationKey>` est envoyé comme corrélation. **Aucune idempotence de création n'est
documentée par Remo** : un timeout/5xx/résultat incomplet reste à rapprocher, sans second POST automatique.
Un refus explicite (authentification, droits, limite de débit ou requête rejetée) est distingué :
`CREATE_REJECTED` permet de corriger puis réessayer, ou d'annuler le brouillon sans référence distante.
Son créneau reste réservé pendant la correction ; aucune salle n'est supposée créée sur un refus certain.
L'organisateur renseigne la référence distante ; DealPME vérifie compte, code, titre, créneau et visibilité
avant de confirmer la réservation. Le maintien du code par le fournisseur sera un point de recette réel.
Le Swagger ne fournit pas de recherche des événements privés par clé de corrélation : cette étape ne
prétend pas retrouver automatiquement une référence dont toute la réponse a été perdue.

Les événements sont créés **sur invitation chez Remo**, même si leur fiche est publique dans DealPME.
La [documentation des événements privés](https://help.virtual.events.com/hc/en-us/articles/39828796782605)
exige l'email de la Guest List. La recette du compte vérifiera aussi l'absence d'autorisation large par
domaine et la visibilité réelle des profils/coordonnées ; le consentement stocké dans DealPME ne doit
pas être confondu avec un réglage fournisseur non vérifié.
Une modification du contenu utilise PUT, sans modifier créneau/capacité hors réservation. Après résultat
indéterminé, le contenu local signale `UPDATE_UNKNOWN` et l'organisateur peut réappliquer ses saisies.
La portée destructive de DELETE est affichée dans l'action de suppression : Remo supprime aussi les
données associées, dont les enregistrements. Une annulation locale générique ne déclenche pas ce DELETE
sans l'action distante explicite. La réservation reste conservée si la suppression n'est pas confirmée.
Les données et audits DealPME ne sont pas supprimés.

Un changement d'environnement ne change pas l'appartenance d'un événement : chaque opération contrôle
son compte/Company ID d'origine. Les quotas sont ceux configurés depuis l'offre confirmée ; la valeur
de simulation ne constitue jamais une preuve du quota souscrit. Les créations effectuées directement
chez le fournisseur ne sont pas couvertes automatiquement par le registre commun.

## Invitations et présence

L'API d'ajout de membres reçoit un email et un rôle, et **envoie une invitation fournisseur**.
DealPME demande donc un accord spécifique, puis persiste email de rapprochement, début et résultat
de la tentative. Le nom choisi dans DealPME n'est pas envoyé comme un attribut non documenté.
Chaque tentative ou rapprochement possède aussi une génération persistée : une réponse tardive ne
remplace pas le rôle ou la tentative courante. Ces conflits sont audités ; groupes et intervenants
contrôlent l'inscription active et l'email vérifié courant avant l'appel fournisseur.

Après perte de réponse, la liste des inscrits Remo est consultée avant de confirmer l'invitation.
Une absence/blocage dans cette liste ne déclenche pas un renvoi automatique. L'inscription DealPME
reste enregistrée si la livraison est incertaine ; les états sont visibles dans la console.
L'état `SENT` signifie une invitation connue/acceptée par Remo, pas une preuve de remise de l'email.
Les invitations d'événements terminés sont refusées. La synchronisation parcourt les inscriptions par
pages de vingt, avec curseur de reprise et bouton pour poursuivre. Les inscriptions déjà confirmées
sont rapprochées sans nouvel email. Le rôle intervenant (`speaker`) se demande explicitement par
l'organisateur avec la même gestion des résultats incertains ; son rejeu confirmé ne renvoie pas l'invitation.

La présence est rapprochée via l'email effectivement utilisé pour l'invitation, puis persistée sous
l'identifiant interne d'inscription. Profils, réponses aux formulaires et tokens renvoyés par Remo sont
exclus de la projection de sortie. Le HMAC du simulateur est refusé **avant le cache** en mode Remo :
aucun webhook réel n'est annoncé sans contrat correspondant. Le retrait d'un groupe ne supprime pas
l'inscription à l'événement ; aucune route de désinscription fournisseur n'est supposée.

## SAML réellement implémenté

`packages/federation` fournit un IdP SAML réutilisable, avec **samlify**, validation XSD via xmllint-WASM,
signature RSA-SHA256/SHA-256 et NameID email. Le signataire ne reçoit que l'email vérifié et l'instant
d'authentification de la session courante. Les destinations/issuer/ACS sont épinglés ; XML externe,
payload surdimensionné, requêtes expirées et bindings inattendus sont refusés.

Flux :

1. Le SP envoie son AuthnRequest à `/sso/remo` par Redirect ou POST.
2. DealPME valide la requête et crée un challenge opaque de cinq minutes, conservé côté serveur.
3. En l'absence de session, retour vers la connexion DealPME, MFA compris selon le rôle.
4. La session, le rôle et l'email vérifié sont relus ; le challenge est consommé atomiquement.
5. Une assertion signée valable au maximum quatre-vingt-dix secondes est envoyée par POST à l'ACS configuré.

Les redirections de reprise sont relatives au site pour conserver les cookies derrière un proxy.
Le formulaire SAML a une CSP à nonce, une destination fixe et `no-store` ; il n'utilise pas le routeur
client pour éviter une prélecture qui consommerait l'assertion. Le RelayState est propre à chaque
requête, non global. L'audit est attendu avant que l'assertion soit renvoyée. Les métadonnées publiques
sont disponibles sur `/sso/remo/metadata`, sans clé privée.

Le module vérifie ForceAuthn et permet la publication d'un certificat précédent pendant une rotation,
avec un signataire utilisant uniquement la clé courante. La capacité du compte Remo à accepter une
période à deux certificats reste à vérifier ; son écran de configuration peut exiger une bascule coordonnée.
La validité du certificat courant est relue à chaque requête, émission et export des métadonnées ;
un processus démarré avant son expiration ne continue pas à signer après. La durée d'assertion est
bornée par cette expiration et le certificat précédent expiré cesse d'être annoncé.
Le Single Logout n'est pas implémenté : la révocation d'une session DealPME bloque les nouvelles émissions,
mais ne prétend pas fermer une session Remo déjà ouverte. SAML authentifie ; l'invitation reste le contrôle
d'admission chez le fournisseur.

Remo impose un SSO commun à tout le compte. L'IdP DealPME est désormais disponible ; son adoption comme
IdP unique et l'intégration des identités des autres produits utilisant le compte doivent être confirmées
avant activation. Les briques cryptographiques ne sont pas liées aux tables d'un seul produit.

## Configuration et activation

Adapter `.env.example` dans un fichier serveur privé :

```dotenv
CONNECTOR_REMO_PROVIDER=remo
CONNECTOR_REMO_API_KEY=<App Token reçu>
REMO_COMPANY_ID=<Company ID reçu>
REMO_API_BASE_URL=https://api.virtual.events.com/api/v1
REMO_EVENT_BASE_URL=https://virtual.events.com
REMO_ACCOUNT_KEY=<identifiant stable du compte partagé>
REMO_MAX_CONCURRENT=<quota confirmé>
REMO_QUOTA_REFERENCE=<référence de l'offre vérifiée>
REMO_HOST_EMAIL=<email du compte hôte Remo>

REMO_SSO_ENABLED=true
REMO_SAML_IDP_ENTITY_ID=https://votre-dealpme/sso/remo/metadata
REMO_SAML_SSO_URL=https://votre-dealpme/sso/remo
REMO_SAML_SP_ENTITY_ID=<Entity ID du SP affiché par Remo>
REMO_SAML_ACS_URL=<ACS affiché par Remo>
REMO_SAML_KEY_FILE=/etc/dealpme/saml/signing-key.pem
REMO_SAML_CERT_FILE=/etc/dealpme/saml/signing-cert.pem
```

Les clés ne sont pas générées ou commitées dans le dépôt. Le serveur vérifie la correspondance clé/
certificat RSA, sa taille et sa validité. Référencer le certificat précédent via
`REMO_SAML_PREVIOUS_CERT_FILE` uniquement pendant la rotation préparée. Les documents de clé, l'IdP et
les quotas sont configurables sans changer les parcours UI. Les salles utilisent le plan/thème configuré
dans `REMO_FLOOR_TEMPLATE` / `REMO_FLOOR_THEME`, dont les valeurs seront vérifiées sur le compte.

### Précontrôle hors réseau — V1-111

Après le build, sur l'hôte qui peut lire les fichiers PEM et la configuration serveur :

```sh
npm run remo:preflight -- --env-file=/etc/dealpme/dealpme.env --output=/tmp/remo-preflight.json
# Sortie JSON seule, pour l'automatisation :
node devX/remo-preflight.mjs --env-file=/etc/dealpme/dealpme.env
```

Le fichier complète et surcharge l'environnement du processus. Il contient la configuration complète
requise par l'API, pas uniquement les paramètres Remo. Le contrôle réutilise son validateur, les
constructeurs d'adaptateurs et l'IdP. Il vérifie modes, URL, paramètres obligatoires, hôte, contradictions
et certificats/clé RSA ; aucun appel réseau ni écriture en base. Code de sortie 0 = PASS, 1 = FAIL.
Les diagnostics donnent des codes et noms de champs, sans valeur secrète, chemin PEM ou exception brute.
`providerQualified:false` et `persistedAccountChecked:false` sont intentionnels : le rapport ne confirme
ni les droits du compte ni sa concordance avec les événements persistés.

### Bascule et retour à la configuration précédente

1. Conserver la configuration précédente hors dépôt. Appliquer les migrations, dont
   `0014_invitation_attempt_generation.sql`, avant de lancer cette version de l'API.
2. Préparer la nouvelle configuration et exécuter le précontrôle sur le même hôte, avec les mêmes
   droits de lecture des PEM que le service. Corriger tout FAIL avant de redémarrer l'API.
3. Redémarrer le service API selon la procédure d'exploitation ; vérifier `/ready`, puis le compte,
   le quota et les métadonnées dans `/organisateur/integration`. Le précontrôle n'applique pas la bascule.
4. Les modes `disabled`, `local` et `remo` conservent les événements existants. Un événement d'un autre
   compte/Company ID ne devient pas accessible ou republiable sous la nouvelle configuration ; aucun
   appel Remo n'est émis par les refus testés. L'accès public n'est proposé que de quinze minutes avant
   le début jusqu'à la fin. Pour reprendre les événements précédents, rétablir leur configuration et
   redémarrer, sans réécrire leur liaison en base.
5. Reprendre une invitation `UNKNOWN` en consultant la présence fournisseur ; ne pas relancer un email
   à l'aveugle. Une création `SYNC_UNKNOWN` conserve sa réservation et nécessite la référence distante
   vérifiée depuis la console. Un redémarrage ne transforme pas un résultat inconnu en échec certain.
6. Pour le compte réel, exécuter V1-112, puis les recettes SAML/branding/parcours V1-113/114/115.
   Consigner les écarts dans V1-116. Les changements SSO affectent tout le compte mutualisé : vérifier
   l'IdP commun et les paramètres du SP avant son activation.

## Vérifications

```sh
npm run build
npm test
npm run ci:smoke
npm run ci:l05-wiring -- --evidence
# Diagnostic ciblé sur une pile jetable (ne remplace pas la recette complète) :
npm run ci:smoke -- --only=remo
```

Preuves : tests de contrat du connecteur, tests SAML de `packages/federation`,
`.ci-artifacts/remo-api-results.json` et captures navigateur. Les essais ciblés portent explicitement
le scope `remo-contract-only` ; la CI normale exécute toujours les suites précédentes et le scope `all`.
Les endpoints de production n'ont reçu aucun appel métier pendant cette recette sans accès.
La matrice `qa/l05-wiring-matrix.json` relie API/services/SSR-BFF/contrôles/tests, et refuse les routes
non classées. Son mode `--evidence` exige le scope complet et les neuf scénarios de revue exécutés.
Constats clos et preuve de régression : `qa/l05-wiring-findings.json`, `qa/l05-wiring-verification.json`.
