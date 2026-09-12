# Remo / Events.com Virtual — préparation du raccordement

Demande du chef de projet pendant L05 : préparer l'intégration complète utile à DealPME, dont SSO
si proposé, marque générale du compte et personnalisation par événement. Les accès doivent permettre
de raccorder les adaptateurs, rejouer les contrats et corriger les écarts plutôt que refaire les parcours.

## Sources officielles consultées le 12/09/2026

| Sujet | Capacité documentée | Qualification du compte possédé |
|---|---|---|
| [API externe](https://help.virtual.events.com/hc/en-us/articles/39817557368077) | Création/modification/suppression et détail d'événement, liste participants/intervenants, ajout de participants. Add-on integrations, Company ID, App Token ; documentation détaillée dans Account Settings / Third-party integration, accès propriétaire. | Accès et contrat détaillé A17 attendus. Aucun endpoint privé inventé. |
| [SSO personnalisé](https://help.virtual.events.com/hc/en-us/articles/40045169811085) | **SAML uniquement**, une configuration par compte, appliquée à tous ses événements. NameID = email principal ; assertion signée RSA-SHA256 ; requête non signée, assertion non chiffrée selon la fiche. | Offre, métadonnées SP, certificats, IdP commun aux produits et parcours exact à qualifier. |
| [White Label](https://help.virtual.events.com/hc/en-us/articles/39817840288781) | Add-on : logo, favicon, fond de connexion, bouton support, sous-domaine, expéditeur et textes des emails événementiels. | Étendue compte/événement et paramètres API à éprouver. |
| Limites White Label | Emails de connexion/magic links gardent l'expéditeur fournisseur ; des logos fournisseur restent sur le tableau de bord My Events. | Ne pas promettre une marque blanche intégrale. |
| [Simultanéité](https://help.virtual.events.com/hc/en-us/articles/39856456469517) | Quota dépendant du plan ; chevauchements totaux/partiels et **borne commune** considérés simultanés. | Quota contractuel A18 attendu ; le quota local n'en est pas une preuve. |
| [Enregistrement vidéo](https://help.virtual.events.com/hc/en-us/articles/40015512503309) | Présentation seulement ; audio/vidéo et écrans partagés, pas Share Video, tableau blanc ou chat. | Essai sur l'offre requis. |
| [Téléchargement recordings](https://help.virtual.events.com/hc/en-us/articles/40011699440397) | Téléchargement depuis Post Event ; rétention annoncée d'un mois, perte à suppression de l'événement. | API de téléchargement inconnue tant que le contrat privé n'est pas reçu. |
| [Transcription native](https://help.virtual.events.com/hc/en-us/articles/47220452266765) | Add-on : conversation **et** présentation ; un transcript par table/scène, français disponible, une langue par événement. En conversation, toutes les tables sont transcrites ; le participant voit celle de sa table. Export ZIP séparé par table/scène. | À comparer en priorité au prototype d'agent. Export API, rétention, droits de réutilisation et consentements A21 à confirmer. |

La transcription native et l'enregistrement vidéo sont deux capacités différentes : la limitation
vidéo à la présentation ne signifie pas que les transcripts de tables sont absents.

## Contrats et surfaces à préparer

- **Compte** : identifiant fournisseur, produits utilisateurs, limites vérifiées, rôles propriétaire/
  gestionnaire/assistant, références de qualification et capacités activées. Les clés restent serveur.
- **Branding global** : profil versionné, logo/favicon/fond de connexion, domaine, expéditeur et modèles
  d'emails, règles de support et limites de la marque blanche. Ne pas modifier le compte depuis une
  simple surcharge d'événement ; mesurer l'effet sur les produits voisins avant bascule.
- **Branding événement** : héritage explicite du profil global, surcharges, version publiée, aperçu et
  preuve de ce qui apparaît réellement dans la salle, à la connexion et dans les emails.
- **Événements** : cycle création/modification/publication/annulation, horaires et fuseaux, inscriptions,
  speakers/managers, capacité, tables/plans/bannières si disponibles, clés de rejeu, synchronisation et reprise.
- **Entrée** : identité vérifiée et admission par événement ; SSO ne remplace ni l'inscription ni les
  restrictions de salle. Les événements privés diaspora/deal n'héritent pas d'un accès public au compte.
- **Présence et intégrations** : événements entrants authentifiés, dédoublonnage, rapprochement d'identités,
  rejets/quarantaine des références inconnues, et récupération après perte de callback.
- **Captation et exports** : source native ou agent, compte/événement/table/scène, personnes autorisées,
  langue, horodatages, couverture et portions manquantes. L'import/traitement des rapports reste cadré en V2.

## SSO : raccordement SAML prévu

Le compte Remo est le Service Provider ; il faut un Identity Provider commun compatible avec les
produits utilisant le compte. Le fournisseur documente l'ACS `https://live.remo.co/__/auth/handler`
et l'Entity ID `http://live.remo.co/`, mais les valeurs **réellement affichées par le compte** seront
les références de configuration. Aucun certificat ou endpoint client n'est accepté depuis le navigateur.

À recevoir/configurer : IdP Entity ID, endpoint d'authentification, certificat public, clé de signature
côté IdP, métadonnées SP, durée des assertions, renouvellement des certificats et politique de session.
Nom d'affichage facultatif ; ne pas envoyer téléphone, société, liens sociaux ou attributs supplémentaires
par défaut. Le NameID email imposé par SAML devra apparaître dans l'information participant : le parcours
SSO transmet davantage que le nom d'affichage du simulateur local.

Recette : assertion signée/altérée/expirée, audience/destinataire inattendus, requête rejouée, identité non
vérifiée, compte révoqué, cookies et retour après connexion, absence d'inscription, événement privé,
deux produits sur le même compte, rotation de certificat. Vérifier les méthodes alternatives de connexion
que Remo conserve même avec le SSO activé ; elles ne doivent pas contourner l'admission événementielle.

Le port d'admission local n'est pas qualifié comme SSO SAML. L'activation du protocole réel et son
adaptateur restent à réaliser/éprouver avec l'IdP retenu et les métadonnées du compte ; cette étape reste
explicitement dans la liste L05 plutôt que d'être considérée comme faite par la présence d'un lien signé.

## Fiche de branchement à réception des accès

1. Recevoir accès propriétaire, add-ons, Company ID, App Token, documentation API et compte sandbox.
2. Archiver capacités/limites de l'offre ; identifier les autres produits et leurs usages hors registre.
3. Configurer compte, marque globale, marque d'un événement témoin et domaine/certificats.
4. Configurer le SAML avec l'IdP retenu ; tester l'email NameID, la session et les admissions privées.
5. Implémenter/ajuster l'adaptateur Remo à partir du contrat réel ; conserver le port et les parcours UI.
6. Rejouer création, modification, rejeu, timeout après acceptation, rapprochement, annulation et quotas.
7. Tester inscription/entrée, callback ou synchronisation de présence et isolement entre organisations.
8. Comparer enregistrement présentation, transcription table/scène et agent ; vérifier les exports réels.
9. Archiver les écarts et corriger l'adaptateur/configuration ; activer uniquement les capacités validées.

Les abonnements alternatifs cités en réunion restent non identifiés/non accessibles ; ils restent dans
la matrice à compléter après réception de leurs noms exacts, sans attribuer de capacités supposées.
