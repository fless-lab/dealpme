# -*- coding: utf-8 -*-
"""
Générateur du classeur de suivi DealPME.
Source unique de vérité : l'onglet Taches. Tout le reste est calculé par formule.
"""
import datetime as dt
import math
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule, DataBarRule

OUT = "/home/raouf/Workspaces/Free/Projects/deal_pme/DealPME_Suivi.xlsx"

# ------------------------------------------------------------------ palette
INK, ACCENT, PAPER, STEEL = "1C2751", "6678F1", "F2F2F3", "5980A6"
OK, OK_BG = "2F6B4F", "E9F2EC"
WARN, WARN_BG = "B07A2B", "FBF1E3"
DANGER, DANGER_BG = "8C3A3A", "F7ECEC"
INFO_BG = "E7E8F7"
WHITE = "FFFFFF"

thin = Side(style="thin", color="C9CCD9")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
F_HEAD = Font(name="Calibri", size=10, bold=True, color=WHITE)
FILL_HEAD = PatternFill("solid", fgColor=INK)
F_TITLE = Font(name="Calibri", size=16, bold=True, color=INK)
F_SUB = Font(name="Calibri", size=10, italic=True, color=STEEL)
F_LABEL = Font(name="Calibri", size=9.5, bold=True, color=STEEL)
F_NORMAL = Font(name="Calibri", size=10, color="1D1F20")
F_BOLD = Font(name="Calibri", size=10, bold=True, color=INK)
F_KPI = Font(name="Calibri", size=20, bold=True, color=INK)
F_FORMULA = Font(name="Calibri", size=10, color="1D1F20")
A_WRAP = Alignment(wrap_text=True, vertical="top")
A_WRAPC = Alignment(wrap_text=True, vertical="center")
A_CENTER = Alignment(horizontal="center", vertical="center")
FILL_CALC = PatternFill("solid", fgColor="F5F6FA")   # cellules calculées (ne pas saisir)
FILL_INPUT = PatternFill("solid", fgColor="FFFDF2")  # cellules à saisir


def head(ws, row, c1, c2, height=None):
    for c in range(c1, c2 + 1):
        cell = ws.cell(row=row, column=c)
        cell.font, cell.fill, cell.alignment, cell.border = F_HEAD, FILL_HEAD, A_WRAPC, BORDER
    if height:
        ws.row_dimensions[row].height = height


def body(ws, row, c1, c2, fill=None, font=None):
    for c in range(c1, c2 + 1):
        cell = ws.cell(row=row, column=c)
        cell.font = font or F_NORMAL
        cell.alignment = A_WRAP
        cell.border = BORDER
        if fill:
            cell.fill = PatternFill("solid", fgColor=fill)


def widths(ws, ws_widths):
    for i, w in enumerate(ws_widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w


def title(ws, text, sub=None):
    ws.sheet_view.showGridLines = False
    ws["B2"] = text
    ws["B2"].font = F_TITLE
    if sub:
        ws["B3"] = sub
        ws["B3"].font = F_SUB


# ------------------------------------------------------------------ données de référence
VERSIONS = [
    # code, objet, début, fin
    ("V1", "Premier produit : cessions d'actifs, espace CCI-Togo, Deal-Ready, démonstration du blocage RPS, Deal-Connect via Remo.co", dt.date(2026, 9, 3), dt.date(2026, 10, 15)),
    ("V2", "Cession de titres en cercle restreint (RPS réel), signature électronique, data room et Q&R", dt.date(2026, 10, 16), dt.date(2026, 11, 25)),
    ("V3", "Négociation et réalisation, LegalTech OHADA, Finance et rétrocession, support, fermeture des portes de conformité", dt.date(2026, 11, 26), dt.date(2026, 12, 30)),
    ("V4", "Alerte & Rebond, Deal-Connect (Remo.co), Guichet Diaspora, Deal-Experts", dt.date(2026, 12, 31), dt.date(2027, 2, 5)),
    ("V5", "VDR Intelligence : DealLens, Evidence Map, Issue Radar, Clean Team", dt.date(2027, 2, 6), dt.date(2027, 2, 28)),
]

# Tâches déjà réalisées ou entamées par le squelette du 09/09/2026 (clé : début du libellé de la tâche).
# (statut, % saisi ou None, fin réelle ou None)
DONE_AT = dt.date(2026, 9, 9)
PROGRESS = {
    "Dépôt monorepo": ("Complétée", None, dt.date(2026, 9, 3)),
    "Environnements dev / staging": ("En cours", 0.7, None),
    "Modèle de données socle": ("Complétée", None, dt.date(2026, 9, 3)),
    "Modèle Deal et AssetDealDetail": ("Complétée", None, dt.date(2026, 9, 4)),
    "Enregistrement d'attribution immuable": ("Complétée", None, dt.date(2026, 9, 7)),
    "Journal DealEvent et machine à états": ("Complétée", None, dt.date(2026, 9, 4)),
    "Rôles et permissions évalués côté serveur": ("Complétée", None, dt.date(2026, 9, 8)),
    "Gestion de session": ("Complétée", None, dt.date(2026, 9, 11)),
    "Consentements séparés": ("Complétée", None, dt.date(2026, 9, 3)),
    "Workflow de confirmation d'adhésion": ("Complétée", None, dt.date(2026, 9, 14)),
    "Vérification RCCM / CFE": ("En cours", 0.9, None),
    "RegistryRecord stocké séparément": ("Complétée", None, dt.date(2026, 9, 4)),
    "Modèle Certification": ("Complétée", None, dt.date(2026, 9, 7)),
    "Workflow de décision nominative": ("Complétée", None, dt.date(2026, 9, 8)),
    "Badge Deal-Ready : affichage": ("Complétée", None, dt.date(2026, 9, 24)),
    "Checklist Deal-Ready et pièces attendues": ("Complétée", None, dt.date(2026, 9, 23)),
    "Écrans côté entreprise : demande, suivi de remédiation": ("Complétée", None, dt.date(2026, 9, 24)),
    "File d'instruction des demandes et remédiation nommée": ("Complétée", None, dt.date(2026, 9, 24)),
    "Tableau de bord institutionnel agrégé": ("Complétée", None, dt.date(2026, 9, 15)),
    "Écrans console CCI-Togo": ("Complétée", None, dt.date(2026, 9, 15)),
    "Écrans authentification": ("Complétée", None, dt.date(2026, 9, 11)),
    "Assistant de constitution de dossier": ("Complétée", None, dt.date(2026, 9, 22)),
    "Upload de documents : scan antivirus": ("Complétée", None, dt.date(2026, 9, 21)),
    "Provenance et versionnage des données déclarées": ("Complétée", None, dt.date(2026, 9, 22)),
    "Contrôle de complétude et liste des manques": ("Complétée", None, dt.date(2026, 9, 23)),
    "Écrans Pass Transmission": ("Complétée", None, dt.date(2026, 9, 23)),
    "Retour en préparation après remarque": ("Complétée", None, dt.date(2026, 10, 2)),
    "Chaîne antivirus éprouvée": ("Complétée", None, dt.date(2026, 10, 1)),
    "Saisie des données financières minimales": ("Complétée", None, dt.date(2026, 10, 6)),
    "Paliers d'abonnement": ("Complétée", None, dt.date(2026, 10, 6)),
    "Responsive mobile sur les parcours V1": ("Complétée", None, dt.date(2026, 10, 7)),
    "Supervision et journaux applicatifs": ("Complétée", None, dt.date(2026, 10, 7)),
    "Sauvegardes de base de la base de données": ("Complétée", None, dt.date(2026, 10, 8)),
    "Tests automatisés": ("Complétée", None, dt.date(2026, 10, 9)),
    "Jeu de données de démonstration complet": ("Complétée", None, dt.date(2026, 10, 9)),
    "Documentation développeur": ("Complétée", None, dt.date(2026, 10, 12)),
    "Inscriptions DEALPME_FIRST": ("Complétée", None, dt.date(2026, 10, 5)),
    "Écran Deal-Connect V1": ("Complétée", None, dt.date(2026, 10, 6)),
    "Classification des champs": ("Complétée", None, dt.date(2026, 10, 8)),
    "Socle i18n": ("Complétée", None, dt.date(2026, 10, 8)),
    "Inscription email": ("Complétée", None, dt.date(2026, 9, 11)),
    "Gabarit applicatif": ("Complétée", None, dt.date(2026, 9, 12)),
    "Tests négatifs : permissions serveur": ("Complétée", None, dt.date(2026, 10, 13)),
    "État actif de la navigation": ("Complétée", None, dt.date(2026, 10, 3)),
    "Champs de formulaire : aide et message": ("Complétée", None, dt.date(2026, 10, 4)),
    "Titre et description propres à chaque écran": ("Complétée", None, dt.date(2026, 10, 3)),
    "États de chargement, d'erreur et page introuvable": ("Complétée", None, dt.date(2026, 10, 5)),
    "Navigation au clavier : lien d'évitement": ("En cours", 0.6, None),
    "Tableaux accessibles : intitulé, portée": ("En cours", 0.7, None),
    "Revue des contrôles désactivés": ("Complétée", None, dt.date(2026, 10, 5)),
    "Fiche opportunité T0": ("Complétée", None, dt.date(2026, 9, 28)),
    "Recherche et filtres": ("Complétée", None, dt.date(2026, 9, 29)),
    "Mise en relation : manifestation": ("Complétée", None, dt.date(2026, 9, 30)),
    "Alertes sauvegardées opt-in": ("Complétée", None, dt.date(2026, 10, 1)),
    "Tableau de bord cédant (vues, intérêts reçus)": ("Complétée", None, dt.date(2026, 10, 1)),
    "Écrans marketplace (liste, détail, recherche)": ("Complétée", None, dt.date(2026, 10, 2)),
    "Calcul de fourchette indicative": ("Complétée", None, dt.date(2026, 9, 7)),
    "Mentions 'indicative, non opposable'": ("Complétée", None, dt.date(2026, 9, 7)),
    "Scénario scripté : dossier titres": ("Complétée", None, dt.date(2026, 10, 2)),
    "Bannière de blocage et texte explicatif": ("Complétée", None, dt.date(2026, 10, 2)),
    "Fixture synthétique dédiée": ("Complétée", None, dt.date(2026, 9, 30)),
    "Écran T1 anonymisé de démonstration": ("Complétée", None, dt.date(2026, 10, 5)),
    "Journal de démonstration : trace lisible": ("Complétée", None, dt.date(2026, 10, 5)),
    "Intégration du design system": ("Complétée", None, dt.date(2026, 9, 11)),
    "Architecture cible et décisions structurantes": ("Complétée", None, dt.date(2026, 9, 4)),
    "Modèle de domaine et invariants": ("Complétée", None, dt.date(2026, 9, 5)),
    "Classification des données et politique de chiffrement": ("Complétée", None, dt.date(2026, 9, 10)),
    "Contrats d'API : enveloppe d'erreur unique": ("Complétée", None, dt.date(2026, 9, 6)),
    "Modèle de menaces V1": ("Complétée", None, dt.date(2026, 9, 9)),
    "Conception frontend : une application par groupes de routes": ("Complétée", None, dt.date(2026, 9, 11)),
    "Conception de l'intégration Remo.co": ("En cours", 0.6, None),
    "Journal d'audit des décisions de certification": ("Complétée", None, dt.date(2026, 9, 14)),
    "Connecteur Remo.co": ("En cours", 0.4, None),
    "Demande de rendez-vous diaspora": ("En cours", 0.3, None),
    "RLS effective": ("Complétée", None, dt.date(2026, 9, 9)),
    "Mots de passe de démonstration uniques": ("Complétée", None, dt.date(2026, 9, 9)),
    "Revue de sécurité interne (liste de contrôle v0": ("Complétée", None, dt.date(2026, 9, 10)),
    "Vérification email, MFA obligatoire": ("Complétée", None, dt.date(2026, 9, 10)),
    "OTP SMS (intégration fournisseur SMS)": ("En cours", 0.6, None),
    "Idempotence persistée": ("Complétée", None, dt.date(2026, 9, 9)),
    "Anti-force-brute": ("Complétée", None, dt.date(2026, 9, 9)),
    "Chiffrement applicatif des champs CONFIDENTIAL_DEAL": ("Complétée", None, dt.date(2026, 9, 10)),
    "En-têtes de sécurité HTTP": ("Complétée", None, dt.date(2026, 9, 8)),
}
# Deux entrées portant la même clé se masquent l'une l'autre en silence : la seconde gagne et l'avancement
# saisi plus haut disparaît sans erreur. Le contrôle ci-dessous a rattrapé le cas le 12/10/2026.
def _check_progress_keys() -> None:
    import re as _re
    from collections import Counter as _Counter
    source = open(__file__, encoding="utf-8").read()
    block = source.split("PROGRESS = {", 1)[1].split("\n}", 1)[0]
    dups = [k for k, n in _Counter(_re.findall(r'^\s*"([^"]+)":', block, _re.M)).items() if n > 1]
    if dups:
        raise SystemExit(f"Clés en double dans PROGRESS : {', '.join(dups)}")


_check_progress_keys()

DEFAULT_OWNER = "Abdou-Raouf"

MODULES = [
    # code, nom, catégorie, processus, version cible, commentaire
    ("FOND", "Fondations : modèle de données et bifurcation actif / titre", "Socle V0", "-", "V1", "Conditionne tous les autres modules"),
    ("TRV", "Transverse technique : infra, CI, design system, QA", "Socle V0", "-", "V1", "Charge répartie sur chaque version"),
    ("IDN", "Identité, abonnement et facturation", "Socle V0", "P08", "V1", "KYC documentaire uniquement, pas de biométrie"),
    ("GOV", "Console institutionnelle CCI-Togo et gouvernance", "Socle V0", "P22", "V1", "Aucun import de la base des membres"),
    ("CCI", "Deal-Ready : certification CCI-Togo", "Socle V0", "P06", "V1", "Décision nominative, jamais automatique"),
    ("MKT", "Pass Transmission : dossier cédant, marketplace, évaluation indicative", "Socle V0", "P04, P05, P09", "V1", "V1 = actifs uniquement"),
    ("RPS", "Regulatory Perimeter Service : divulgation T0/T1/T2", "Socle V0", "P07, P10", "V1 (démo) / V2 (réel)", "Différenciateur central"),
    ("SIG", "Signature électronique et preuve", "Partenaire-dépendant", "P11", "V2", "Prestataire PSC accrédité ARCEP"),
    ("VDR", "Data room et questions-réponses", "Socle V0", "P12", "V2", "Rendu serveur, filigrane, révocation < 60 s"),
    ("NEG", "Négociation : offre, LOI, audit d'acquisition", "Socle V0", "P14, P15", "V3", ""),
    ("REA", "Réalisation et traçabilité de la transmission", "Socle V0", "P16", "V3", "Sans Deal-Pay natif"),
    ("LEG", "LegalTech OHADA et conformité fiscale", "Partenaire-dépendant", "P19", "V3", "Partenaire fiscal à confirmer"),
    ("FIN", "Finance : frais, rétrocession CCI, reporting", "Socle V0", "P24", "V3", "Barème activable après avis juridique écrit"),
    ("SUP", "Support et accès privilégiés", "Socle V0", "P23", "V3", "Moindre privilège"),
    ("OPS", "Exploitation, sécurité, continuité (SLA 99,5 %)", "Socle V0", "P25", "V1 (base) / V3 (durci)", "Obligation de résultat contractuelle"),
    ("REB", "Alerte & Rebond : entreprises en difficulté", "Socle V0", "P17, P18", "V4", "Confidentialité renforcée"),
    ("CNX", "Deal-Connect : événements B2B (Remo.co)", "Socle V0", "P20", "V4", "Connecteur externe Remo.co"),
    ("DIA", "Guichet Diaspora et investissement", "Socle V0", "P21", "V4", "Rendez-vous vidéo via Remo.co"),
    ("EXP", "Deal-Experts : mobilisation d'expert indépendant", "Arbitrage requis", "P13", "V4 (à confirmer)", "Contractuel (P13) ou cible future : à trancher"),
    ("VDR-IA", "VDR Intelligence : DealLens et surfaces de diligence", "Extension conçue, non prod", "-", "V5", "Aucun fournisseur IA contracté"),
]

HORS_PERIMETRE = [
    ("Deal-Pay et séquestre (escrow)", "Hors périmètre v0", "Frontière d'intégration partenaire licencié désactivée ; avenant requis"),
    ("Valorisation algorithmique automatique", "Hors périmètre v0", "Le v0 interdit toute fourchette présentée comme un avis DealPME"),
    ("Certification automatique / score de readiness", "Hors périmètre v0", "Décision nominative CCI-Togo obligatoire"),
    ("KYC biométrique", "Différé (P2)", "Activable après autorisation IPDCP, sous drapeau fonctionnel"),
    ("Broker Agency Hub multi-tenant", "Hors périmètre v0", "Pas de compte maître de cabinet M&A dans le v0"),
    ("Marques globales génériques (Stripe, DocuSign, SumSub, Ecobank)", "Hors périmètre v0", "Remplacées par des vendeurs locaux réels"),
]

# ------------------------------------------------------------------ tâches
# (version, module, lot, tâche, critère de fin, charge j/p, priorité, statut, bloquant, dépendances)
T = []
def add(v, m, lot, tache, crit, ch, prio="Moyenne", statut=None, bloquant="Non", dep=""):
    T.append((v, m, lot, tache, crit, ch, prio, statut or ("À faire" if v == "V1" else "Backlog"), bloquant, dep))

# ---------------- V1 (274 j/p) ----------------
add("V1", "TRV", "Conception", "Architecture cible et décisions structurantes : monolithe modulaire, RPS indépendant, isolation de la data room, TypeScript de bout en bout, connecteurs externes, sessions serveur (ADR 0001 à 0006)", "Chaque décision est un ADR archivé avec contexte, options écartées et conséquences", 3, "Haute", bloquant="Oui")
add("V1", "FOND", "Conception", "Modèle de domaine et invariants : entités, agrégats, machine à états du deal, immutabilités (type de cession, attribution), isolation par organisation", "Schéma de domaine relu ; chaque invariant est porté par une contrainte ou un déclencheur en base, pas seulement par le code", 3, "Haute", bloquant="Oui")
add("V1", "FOND", "Conception", "Classification des données et politique de chiffrement : catégories PUBLIC / INTERNAL / PERSONAL / CONFIDENTIAL_DEAL, champs chiffrés, gestion et rotation des clés", "Registre des champs par catégorie ; procédure de rotation écrite", 2, "Haute")
add("V1", "TRV", "Conception", "Contrats d'API : enveloppe d'erreur unique, codes distincts (NOT_FOUND, FORBIDDEN, PERIMETER_BLOCKED), projection serveur par palier, pagination, idempotence", "Contrats typés partagés entre API et interface ; aucun code d'erreur ambigu", 2, "Haute")
add("V1", "OPS", "Conception", "Modèle de menaces V1 : acteurs, surfaces (inscription, dossier, publication, certification, webhooks), scénarios d'abus et exigences de sécurité dérivées", "Chaque menace retenue est reliée à une tâche du lot Sécurité ou à une entrée de l'onglet Securite", 3, "Haute")
add("V1", "TRV", "Conception", "Conception frontend : une application par groupes de routes (public, espaces par rôle, data room), BFF de session à cookie httpOnly, laboratoire de composants, règles d'états d'écran", "Document frontend relu ; toute page connaît ses états vide, chargement, erreur et refus", 2, "Haute")
add("V1", "CNX", "Conception", "Conception de l'intégration Remo.co : séquences DEALPME_FIRST et REMO_FIRST, rapprochement des identités, sécurité des webhooks, marque blanche", "Diagrammes de séquence validés ; aucun contact échangé sans consentement dans le flux", 2, "Haute", dep="Cadrage Remo.co")
add("V1", "TRV", "Fondations", "Dépôt monorepo (apps/, packages/), conventions de code, CI de base", "Pipeline CI vert sur une branche vide, lint et tests exécutés", 3, "Haute")
add("V1", "TRV", "Fondations", "Environnements dev / staging, gestion des secrets, déploiement de base", "Déploiement automatique de staging depuis la branche principale", 4, "Haute")
add("V1", "FOND", "Fondations", "Modèle de données socle : Organisation, User, Person, Company", "Migrations appliquées, classification de chaque champ renseignée", 4, "Haute")
add("V1", "FOND", "Fondations", "Modèle Deal et AssetDealDetail, typage ASSET_DEAL / SHARE_DEAL immuable", "Impossible de modifier dealType après création (test négatif)", 4, "Haute")
add("V1", "FOND", "Fondations", "Classification des champs (PUBLIC, INTERNAL, PERSONAL, CONFIDENTIAL_DEAL) dans les migrations", "Chaque colonne porte sa classification en commentaire de migration", 2, "Haute")
add("V1", "FOND", "Fondations", "Enregistrement d'attribution immuable à la création de compte (canal, campagne, référence CCI)", "Attribution non modifiable après création (test négatif)", 2, "Haute")
add("V1", "FOND", "Fondations", "Journal DealEvent et machine à états du deal (version réduite V1)", "Transition invalide renvoie 409, chaque transition journalisée", 4, "Haute")
add("V1", "TRV", "Fondations", "Socle i18n français-source, formats FCFA (entier, sans décimale), dates, typographie", "Aucune chaîne anglaise dans l'interface, montants en XOF entiers", 3, "Moyenne")
add("V1", "OPS", "Fondations", "Supervision et journaux applicatifs de base", "Journaux centralisés, alerte sur erreur 5xx", 3, "Moyenne")
add("V1", "OPS", "Fondations", "Sauvegardes de base de la base de données", "Sauvegarde quotidienne, restauration testée une fois", 2, "Moyenne")

add("V1", "OPS", "Sécurité", "RLS effective : rôle applicatif sans contournement, contexte app.organisation_id et app.roles par transaction", "Test négatif : un cédant ne lit pas le dossier d'un autre cédant", 4, "Haute", bloquant="Oui")
add("V1", "OPS", "Sécurité", "Anti-force-brute : limitation de débit par IP et par compte, verrouillage progressif, journal des échecs", "Cinquième échec en une minute renvoie 429 et laisse une trace", 2, "Haute")
add("V1", "OPS", "Sécurité", "Vérification email, MFA obligatoire pour les officiers CCI-Togo et les administrateurs, liaison OTP", "Officier sans second facteur ne peut pas certifier", 3, "Haute", dep="OTP SMS")
add("V1", "OPS", "Sécurité", "Chiffrement applicatif des champs CONFIDENTIAL_DEAL, clé gérée hors base, rotation documentée", "Prix illisible dans un dump de la base", 3, "Haute")
add("V1", "OPS", "Sécurité", "En-têtes de sécurité HTTP, CORS strict, cookies sécurisés, taille maximale des corps de requête", "Scan d'en-têtes sans constat, origine inconnue refusée", 1, "Moyenne")
add("V1", "OPS", "Sécurité", "Idempotence persistée en base et vérification de signature HMAC sur tous les webhooks", "Rejeu d'un webhook sans double effet ; signature invalide rejetée", 2, "Haute")
add("V1", "OPS", "Sécurité", "Revue de sécurité interne (liste de contrôle v0 : paliers, URL pré-signées, compteur RPS) et scan de dépendances bloquant en CI", "Rapport de revue archivé, CI rouge sur vulnérabilité critique", 3, "Haute")
add("V1", "OPS", "Sécurité", "Chaîne antivirus éprouvée contre un moteur ClamAV réel (service local et intégration continue)", "Le dépôt d'une pièce reconnue est refusé par ClamAV, pas seulement par le moteur de développement", 2, "Haute", dep="Service ClamAV déployé")
add("V1", "OPS", "Sécurité", "Mots de passe de démonstration uniques par compte, jeu de démonstration interdit hors environnement local", "Le chargement refuse de s'exécuter si NODE_ENV n'est pas development", 1, "Moyenne")

add("V1", "IDN", "Auth et rôles", "Inscription email + mot de passe (Argon2id), vérification email", "Compte créé, email vérifié, mot de passe jamais en clair", 3, "Haute")
add("V1", "IDN", "Auth et rôles", "OTP SMS (intégration fournisseur SMS)", "Code reçu et validé en moins de 60 s en test", 3, "Haute")
add("V1", "IDN", "Auth et rôles", "Rôles et permissions évalués côté serveur (cédant, investisseur, agent CCI-Togo, admin)", "Chaque endpoint refuse un rôle non autorisé (tests négatifs)", 4, "Haute")
add("V1", "IDN", "Auth et rôles", "Gestion de session : expiration, liste des appareils, révocation à distance", "Session révoquée inutilisable immédiatement", 2, "Moyenne")
add("V1", "IDN", "Auth et rôles", "Consentements séparés (CGU, confidentialité, marketing)", "Trois cases distinctes, marketing non pré-coché", 2, "Moyenne")
add("V1", "IDN", "Auth et rôles", "Paliers d'abonnement : modèle et entitlements (sans paiement en V1)", "Entitlement résolu depuis un service unique versionné", 4, "Moyenne")
add("V1", "IDN", "Auth et rôles", "Écrans authentification (connexion, inscription, OTP, profil)", "Parcours complet sur mobile et desktop", 4, "Haute")

add("V1", "GOV", "Espace CCI-Togo", "Workflow de confirmation d'adhésion (demande, décision, référence stockée)", "Seule la référence de confirmation est stockée, jamais la base des membres", 4, "Haute")
add("V1", "GOV", "Espace CCI-Togo", "Vérification RCCM / CFE : adaptateur (API si disponible, sinon saisie manuelle supervisée)", "Source et horodatage de vérification stockés", 5, "Haute", bloquant="Oui", dep="Réponse sur l'API CFE/RCCM")
add("V1", "GOV", "Espace CCI-Togo", "RegistryRecord stocké séparément des données déclarées par le cédant", "Deux tables distinctes, aucune fusion à l'affichage", 2, "Haute")
add("V1", "GOV", "Espace CCI-Togo", "Tableau de bord institutionnel agrégé (version minimale)", "Aucune vue sur le contenu confidentiel d'un dossier", 3, "Moyenne")
add("V1", "GOV", "Espace CCI-Togo", "Écrans console CCI-Togo", "Rôles et journal d'audit séparés du back-office plateforme", 5, "Haute")

add("V1", "CCI", "Deal-Ready", "Modèle Certification : portée, décision, officier, expiration, révocation", "Chaque décision porte un officier nommé", 2, "Haute")
add("V1", "CCI", "Deal-Ready", "Workflow de décision nominative (octroi, refus, retrait) et déclaration de conflit d'intérêts", "Octroi automatique impossible par construction (test négatif)", 4, "Haute")
add("V1", "CCI", "Deal-Ready", "Checklist Deal-Ready et pièces attendues", "Liste des manques visible par l'entreprise", 3, "Moyenne")
add("V1", "CCI", "Deal-Ready", "Écrans côté entreprise : demande, suivi de remédiation", "Statut et pièces manquantes visibles", 4, "Moyenne")
add("V1", "CCI", "Deal-Ready", "Badge Deal-Ready : affichage avec périmètre et limites explicites", "Texte du badge précise ce qui est vérifié et ce qui ne l'est pas", 2, "Haute")
add("V1", "CCI", "Deal-Ready", "File d'instruction des demandes et remédiation nommée côté officier", "Une demande peut recevoir des compléments libellés sans être refusée ; la décision clôt la demande", 3, "Moyenne")
add("V1", "CCI", "Deal-Ready", "Journal d'audit des décisions de certification", "Chaque décision exportable avec horodatage et officier", 2, "Moyenne")

add("V1", "MKT", "Dossier cédant", "Assistant de constitution de dossier : étapes, branchement par type de cession dès l'étape 1", "Parcours actif complet, branche titres présente mais bloquée en V1", 6, "Haute")
add("V1", "MKT", "Dossier cédant", "Upload de documents : scan antivirus, stockage chiffré, jamais d'URL publique", "Fichier infecté rejeté, URL directe inaccessible (test négatif)", 4, "Haute")
add("V1", "MKT", "Dossier cédant", "Provenance et versionnage des données déclarées", "Chaque valeur porte source et date, mention 'déclaré, non audité'", 3, "Haute")
add("V1", "MKT", "Dossier cédant", "Contrôle de complétude et liste des manques", "Dossier incomplet reste en DRAFT", 3, "Moyenne")
add("V1", "MKT", "Dossier cédant", "Retour en préparation après remarque de la CCI-Togo (dossier soumis rendu modifiable, motif conservé)", "Un dossier soumis peut revenir en préparation avec le motif visible du cédant", 2, "Moyenne")
add("V1", "MKT", "Dossier cédant", "Écrans Pass Transmission (assistant, récapitulatif)", "Récapitulatif fidèle aux données saisies", 5, "Haute")

add("V1", "MKT", "Marketplace actifs", "Fiche opportunité T0 (secteur, région, tranche de CA) et publication", "Aucun champ au-delà de T0 sérialisé (allow-list serveur)", 4, "Haute")
add("V1", "MKT", "Marketplace actifs", "Recherche et filtres (secteur, région, tranche, statut de certification)", "Résultats limités aux champs T0", 4, "Haute")
add("V1", "MKT", "Marketplace actifs", "Mise en relation : manifestation d'intérêt et messagerie simple (pièces jointes bloquées)", "Intérêt tracé, message reçu, pièce jointe refusée", 5, "Haute")
add("V1", "MKT", "Marketplace actifs", "Alertes sauvegardées opt-in (version simple)", "Aucune alerte sans opt-in explicite", 3, "Basse")
add("V1", "MKT", "Marketplace actifs", "Tableau de bord cédant (vues, intérêts reçus)", "Compteurs cohérents avec le journal", 3, "Moyenne")
add("V1", "MKT", "Marketplace actifs", "Écrans marketplace (liste, détail, recherche)", "Six onglets de la fiche opportunité conformes à la Tranche 3", 5, "Haute")

add("V1", "MKT", "Évaluation indicative", "Saisie des données financières minimales et retraitements documentés", "Retraitement tracé avec justification", 3, "Moyenne")
add("V1", "MKT", "Évaluation indicative", "Calcul de fourchette indicative, méthode et sources affichées", "Méthode, date et sources visibles à côté du résultat", 3, "Moyenne")
add("V1", "MKT", "Évaluation indicative", "Mentions 'indicative, non opposable' et journal de calcul versionné", "Mention non masquable, calcul rejouable", 2, "Haute")

add("V1", "RPS", "Démonstration RPS", "Scénario scripté : dossier titres, tentative de publication trop large", "Scénario rejouable en moins de 3 minutes", 4, "Moyenne")
add("V1", "RPS", "Démonstration RPS", "Bannière de blocage et texte explicatif (risque de nullité, paliers T0/T1)", "Texte validé par M. Bruno", 3, "Moyenne")
add("V1", "RPS", "Démonstration RPS", "Fixture synthétique dédiée, étiquetée 'démonstration'", "Étiquette visible sur chaque écran du scénario", 2, "Moyenne")
add("V1", "RPS", "Démonstration RPS", "Écran T1 anonymisé de démonstration", "Aucune identité, prix ni conditions affichés", 5, "Moyenne")
add("V1", "RPS", "Démonstration RPS", "Journal de démonstration : trace lisible des décisions simulées", "Journal consultable pendant la démo", 3, "Basse")
add("V1", "RPS", "Démonstration RPS", "Recette du scénario avec M. Bruno", "Validation écrite du déroulé", 1, "Haute")

add("V1", "CNX", "Deal-Connect (Remo)", "Cadrage de l'intégration Remo.co : plan retenu, API, SSO, webhooks, marque blanche", "Périmètre d'intégration validé par M. Bruno sur la documentation Remo", 3, "Haute", bloquant="Oui")
add("V1", "CNX", "Deal-Connect (Remo)", "Connecteur Remo.co : création d'événements, lien d'accès unique, webhooks de présence", "Présence remontée et rattachée à l'inscription DealPME", 8, "Haute", dep="Cadrage Remo.co")
add("V1", "CNX", "Deal-Connect (Remo)", "Inscriptions DEALPME_FIRST : consentement d'échange de contacts, attribution de campagne", "Aucun contact échangé sans consentement explicite", 3, "Haute")
add("V1", "CNX", "Deal-Connect (Remo)", "Écran Deal-Connect V1 : liste des événements, inscription, bouton d'accès Remo", "Parcours inscription puis accès en moins de trois clics", 4, "Moyenne")
add("V1", "DIA", "Deal-Connect (Remo)", "Demande de rendez-vous diaspora avec avis transfrontalier, entretien vidéo via Remo après confirmation humaine", "Aucune demande sans reconnaissance de l'avis transfrontalier", 4, "Moyenne", dep="Connecteur Remo.co")
add("V1", "TRV", "Frontend et design", "Intégration du design system (tokens et composants de base issus de la Tranche 3)", "Tokens couleurs et typographie conformes à la charte", 5, "Haute")
add("V1", "TRV", "Frontend et design", "Gabarit applicatif : AppShell, navigation, états vide / chargement / erreur", "Chaque écran possède ses trois états", 4, "Haute")
add("V1", "TRV", "Frontend et design", "Responsive mobile sur les parcours V1", "Aucune casse de mise en page entre 360 et 1920 px", 4, "Moyenne")
add("V1", "TRV", "Frontend et design", "Revue visuelle avec le designer UI/UX", "Liste des écarts traitée", 2, "Moyenne", dep="Designer UI/UX confirmé")

# Lot de finition ouvert le 11/09/2026 après audit de l'interface : ces points ne cassent rien, mais ils
# distinguent un produit fini d'une maquette fonctionnelle, et ils se voient en présentation.
add("V1", "TRV", "Finition frontend", "État actif de la navigation : élément courant mis en évidence dans la barre et dans les navigations de service", "Chaque écran signale où l'on se trouve, au clavier comme à l'œil", 1, "Haute")
add("V1", "TRV", "Finition frontend", "Champs de formulaire : aide et message d'erreur reliés au champ, focus porté sur le premier champ fautif", "Un lecteur d'écran annonce l'aide et l'erreur ; la correction commence au bon endroit", 2, "Haute")
add("V1", "TRV", "Finition frontend", "Titre et description propres à chaque écran", "L'onglet du navigateur et l'historique nomment l'écran, pas seulement le produit", 1, "Moyenne")
add("V1", "TRV", "Finition frontend", "États de chargement, d'erreur et page introuvable, en français", "Aucune page blanche ni message par défaut du cadre technique", 2, "Haute")
add("V1", "TRV", "Finition frontend", "Navigation au clavier : lien d'évitement, repères de page, ordre de tabulation après une action", "Le parcours complet est praticable sans souris", 1, "Moyenne")
add("V1", "TRV", "Finition frontend", "Tableaux accessibles : intitulé, portée des colonnes, en-têtes de ligne", "Chaque tableau se lit hors contexte visuel", 1, "Moyenne")
add("V1", "TRV", "Finition frontend", "Revue des contrôles désactivés et des liens ouvrant un nouvel onglet", "Un contrôle désactivé dit pourquoi ; un nouvel onglet est annoncé", 1, "Moyenne")
add("V1", "TRV", "Finition frontend", "Passe de finition visuelle sur les six parcours (espacements, alignements, états au survol et au focus)", "Écarts relevés lors de la revue traités ou inscrits", 3, "Moyenne")
add("V1", "TRV", "QA et livraison", "Tests automatisés : unitaires et bout en bout sur les parcours critiques", "Couverture des parcours inscription, dossier, publication, certification", 5, "Haute")
add("V1", "TRV", "QA et livraison", "Tests négatifs : permissions serveur, accès non autorisés, contrôles morts", "Aucun contrôle visible sans réaction définie", 3, "Haute")
add("V1", "TRV", "QA et livraison", "Captures de régression visuelle sur le laboratoire de composants (1440 x 960 et 390 x 844)", "Un écart visuel non intentionnel fait échouer la chaîne d'intégration", 2, "Moyenne")
add("V1", "TRV", "QA et livraison", "Jeu de données de démonstration complet (synthétique, étiqueté)", "Aucune donnée réelle, étiquette visible", 3, "Haute")
add("V1", "TRV", "QA et livraison", "Recette interne et corrections", "Zéro anomalie bloquante ouverte", 4, "Haute")
add("V1", "TRV", "QA et livraison", "Documentation développeur et guide de démonstration", "Nouvel arrivant opérationnel en une journée", 3, "Moyenne")
add("V1", "TRV", "QA et livraison", "Préparation de la démonstration du 15/10 (script, environnement, données)", "Répétition générale réalisée", 2, "Haute")

# ---------------- V2 (190 j/p) ----------------
add("V2", "MKT", "Mise en relation", "Qualification d'un repreneur par le cédant : décision tracée qui ouvre le palier suivant", "Aucune ouverture de palier sans décision nommée du cédant", 4, "Haute")
add("V2", "MKT", "Mise en relation", "Suspension réversible d'une publication (amendement de la machine à états du v0)", "Un dossier suspendu redevient invisible sans être abandonné ; la transition est journalisée", 3, "Moyenne", bloquant="Oui", dep="Accord de M. Bruno sur l'amendement")
add("V2", "TRV", "Conception", "Contrats d'interaction : documenter les 368 contrôles du dépôt (déclencheur, autorisation, source, succès, blocage, audit) et reprendre les identifiants officiels sur les surfaces couvertes par le corpus", "Aucun contrat marqué à documenter ; conformité au corpus en hausse à chaque surface reprise", 5, "Haute", bloquant="Oui", dep="Décision A15")
add("V2", "TRV", "QA et sécurité", "Transposition des tests d'acceptation P0 du corpus (AI-01 à AI-06, DOC-01 à DOC-03, Q&A-01, UI-01) en contrôles automatisés", "Chaque test du corpus a son contrôle exécutable, avant écriture des surfaces", 4, "Haute")
add("V2", "TRV", "QA et sécurité", "Preuves de recette du Release Gate : résultats de bout en bout, couverture des contrôles, captures desktop et mobile, journal de fidélité", "La livraison produit les quatre artefacts attendus par le Release Gate", 3, "Moyenne")
add("V2", "MKT", "Mise en relation", "Vérité financière canonique : compte de résultat 5 ans, bilan et flux 3 ans, besoin en fonds de roulement, délais clients et fournisseurs, dette brute et nette, avec provenance et unité", "Le poste de travail de transaction dispose des données exigées par le standard d'implémentation", 6, "Haute")
add("V2", "RPS", "Conception", "Conception du circuit RPS réel : modèle de cercle et de personne unique, plafond et seuils, admission humaine, journal réglementaire à chaîne de hachage, contrat d'API du service", "Spécification relue par le conseil juridique ; chaque règle du v0 (P07, P10) a sa contrepartie technique", 4, "Haute", bloquant="Oui")
add("V2", "VDR", "Conception", "Conception de la data room : stockage chiffré isolé, rendu serveur, filigrane dynamique, révocation en moins de 60 s, journal d'accès, modèle de permissions par dossier", "Aucun chemin d'accès direct aux fichiers ; schéma de permissions validé sur les 12 cas de référence", 4, "Haute", bloquant="Oui")
add("V2", "SIG", "Conception", "Conception de la signature électronique : intégration du prestataire PSC, preuve et archivage, repli papier, statuts de signature dans la machine à états", "Séquences de signature et de repli documentées ; contrat de preuve défini", 2, "Haute", dep="Contrat PSC")
add("V2", "TRV", "Conception", "Revue d'architecture V2 et mise à jour du modèle de menaces (paliers T1/T2, data room, signature)", "ADR mis à jour ; menaces nouvelles reliées aux tests de QA et sécurité", 2, "Haute")
add("V2", "RPS", "Circuit RPS réel", "Micro-service RPS indépendant : datastore, API, déploiement séparé", "Déployable indépendamment du reste de la plateforme", 6, "Haute")
add("V2", "RPS", "Circuit RPS réel", "Table Disclosure append-only et compteur par personne (pas par session)", "Révocation crée une ligne, ne supprime jamais", 5, "Haute")
add("V2", "RPS", "Circuit RPS réel", "Graphe de personnes liées (comptées une seule fois)", "Deux comptes liés comptent pour une personne", 4, "Haute")
add("V2", "RPS", "Circuit RPS réel", "Plafond de cercle (défaut 50), seuils 80 % et 100 %, bascule en admission manuelle", "Blocage effectif à 100 % (test négatif)", 4, "Haute")
add("V2", "RPS", "Circuit RPS réel", "Workflow d'admission humaine : file, décision, justification enregistrée", "Admission automatique impossible par construction", 6, "Haute")
add("V2", "RPS", "Circuit RPS réel", "Filtre de communication sortante (permettre, caviarder, bloquer)", "Tout message sur un dossier titres passe par le filtre", 5, "Haute")
add("V2", "RPS", "Circuit RPS réel", "Journal réglementaire haché et export du pack de preuves par dossier", "Chaîne de hachage vérifiable, archive signée", 5, "Haute")
add("V2", "RPS", "Circuit RPS réel", "Allow-list serveur des champs par palier T0 / T1 / T2", "Prix jamais sérialisé sous T2 (test négatif)", 3, "Haute")
add("V2", "RPS", "Circuit RPS réel", "Écrans admission et cercle (conformité)", "Compteur et capacité restante visibles", 2, "Moyenne")

add("V2", "SIG", "Signature électronique", "Sélection et contractualisation du prestataire PSC accrédité (coordination)", "Contrat signé, attestation d'accréditation archivée", 3, "Haute", bloquant="Oui")
add("V2", "SIG", "Signature électronique", "Intégration API de signature qualifiée, webhooks à signature vérifiée", "Webhook non signé rejeté (test négatif)", 7, "Haute", dep="Contrat PSC")
add("V2", "SIG", "Signature électronique", "Parcours de repli papier : PDF, contre-signature, vérification CCIT", "Un utilisateur refusant la signature électronique n'est pas bloqué", 4, "Haute")
add("V2", "SIG", "Signature électronique", "SignatureEvidence : hash SHA-256, chaîne de certificats, jeton d'horodatage", "Preuve complète stockée pour chaque NDA", 4, "Haute")
add("V2", "SIG", "Signature électronique", "Intégration archivage électronique accrédité (PSAE)", "Référence d'archive stockée sur chaque preuve", 5, "Haute")
add("V2", "SIG", "Signature électronique", "Écrans NDA : génération, signature, statut", "Statut NDA visible côté cédant et investisseur", 2, "Moyenne")

add("V2", "VDR", "Data room", "Stockage objet chiffré, URLs pré-signées courtes liées à la session", "Accès direct hors session refusé", 5, "Haute")
add("V2", "VDR", "Data room", "Visualiseur rendu serveur, page à page, chargement progressif (3G)", "Première page en moins de 6 s sur réseau de référence", 8, "Haute")
add("V2", "VDR", "Data room", "Filigrane dynamique par page (identité, compte, horodatage, référence du deal)", "Chaque page rendue porte le filigrane (test DOC-02)", 5, "Haute")
add("V2", "VDR", "Data room", "Arborescence OHADA par défaut et gestion des dossiers", "Squelette créé automatiquement à l'ouverture", 4, "Moyenne")
add("V2", "VDR", "Data room", "Permissions par document, téléchargement désactivé par défaut", "Téléchargement refusé sans droit explicite (test DOC-01)", 5, "Haute")
add("V2", "VDR", "Data room", "Grants d'accès scopés avec expiration obligatoire", "Accès perpétuel impossible à créer", 4, "Haute")
add("V2", "VDR", "Data room", "Révocation effective en moins de 60 s avec invalidation des URLs", "Test chronométré de révocation", 4, "Haute")
add("V2", "VDR", "Data room", "Journal DocumentView : qui, quel document, quand, durée, IP", "Export du journal par dossier", 4, "Haute")
add("V2", "VDR", "Data room", "Upload en masse, antivirus, OCR des documents photographiés", "Reprise d'un upload interrompu", 6, "Moyenne")
add("V2", "VDR", "Data room", "Écrans data room : arborescence, visualiseur, administration des accès", "Parcours complet sur mobile", 5, "Haute")

add("V2", "VDR", "Questions-réponses", "Fils de questions par document, visibilité contrôlée par le cédant", "Question invisible aux autres investisseurs par défaut", 6, "Haute")
add("V2", "VDR", "Questions-réponses", "Statuts, catégories, pièces jointes et journalisation des actions", "Chaque création / réponse / clôture journalisée", 4, "Moyenne")
add("V2", "VDR", "Questions-réponses", "Écrans Q&R", "Filtre par statut et par document", 5, "Moyenne")

add("V2", "TRV", "QA et sécurité", "Storybook du design system, alimenté par les mêmes composants que le laboratoire", "Le designer revoit chaque variante sans passer par l'application", 3, "Moyenne", dep="Designer UI/UX confirmé")
add("V2", "TRV", "QA et sécurité", "Tests de contournement de palier et de fuite T0 / T1 (DISCLOSURE_LEAK)", "Zéro fuite sur les 12 cas de référence", 6, "Haute")
add("V2", "TRV", "QA et sécurité", "Tests de révocation et d'expiration (REVOKED_ACCESS_ALLOWED)", "Utilisateur révoqué sans accès résiduel", 4, "Haute")
add("V2", "TRV", "QA et sécurité", "Revue de sécurité interne et préparation du périmètre de pentest", "Périmètre de pentest rédigé", 5, "Haute")
add("V2", "TRV", "QA et sécurité", "Recette V2 et corrections", "Zéro anomalie bloquante ouverte", 5, "Haute")

# ---------------- V3 (179 j/p) ----------------
add("V3", "NEG", "Conception", "Conception de la négociation et de la réalisation : machine à états complète (offre, LOI, audit, réalisation), registre des points ouverts, événements de frais", "Chaque transition est spécifiée avec ses préconditions et ses effets journalisés", 3, "Haute", bloquant="Oui")
add("V3", "FIN", "Conception", "Conception du moteur de frais et de rétrocession : barème versionné sous drapeau juridique, journal de calcul recalculable, rapport trimestriel", "Un calcul peut être rejoué à l'identique à partir du journal ; barème inactif sans avis écrit", 2, "Haute")
add("V3", "LEG", "Conception", "Conception LegalTech : modèle de gabarit versionné, variables, génération PDF, mention obligatoire, traçabilité de la revue du conseil", "Schéma de gabarit validé avec le conseil juridique", 2, "Moyenne")
add("V3", "OPS", "Exploitation", "Acheminement des alertes d'exploitation : seuils, canal d'astreinte, accusé de prise en charge", "Une erreur serveur répétée réveille quelqu'un, sans dépendre d'une console consultée à la main", 3, "Haute")
add("V3", "OPS", "Exploitation", "Chiffrement au repos du stockage objet par un KMS géré et rotation documentée des clés", "La clé de développement de MinIO n'existe plus en production ; la rotation est éprouvée", 3, "Haute")
add("V3", "SUP", "Support", "Procédure de purge et de rétention des pièces et des valeurs déclarées (effacement encadré par le DPO)", "Durées de conservation écrites, effacement tracé et irréversible", 3, "Haute", dep="DPO désigné")
add("V3", "OPS", "Conception", "Conception de l'exploitation et du support : SLA 99,5 %, supervision, sauvegardes et restauration, procédure d'incident, accès privilégiés et mode break-glass journalisé", "Plan d'exploitation relu ; chaque accès privilégié est tracé et limité dans le temps", 3, "Haute")
add("V3", "LEG", "LegalTech OHADA", "Modèles versionnés : NDA, LOI, pacte simplifié, SPA, cession d'actifs, contrat de travail (Code du travail togolais)", "Chaque modèle porte version et référence du conseil", 8, "Haute")
add("V3", "LEG", "LegalTech OHADA", "Moteur de génération PDF avec variables et mention 'aide à la rédaction, pas un conseil juridique'", "Mention présente sur chaque document généré", 7, "Haute")
add("V3", "LEG", "LegalTech OHADA", "Revue des modèles par le conseil juridique (coordination)", "Avis écrit archivé par modèle", 4, "Haute", bloquant="Oui")
add("V3", "LEG", "LegalTech OHADA", "Liaison avec transferRestrictions : alertes clauses d'agrément et de préemption", "Alerte affichée dès qu'une restriction existe", 3, "Moyenne")
add("V3", "LEG", "Conformité fiscale", "Intégration du module fiscal partenaire (simulation, attestation) derrière drapeau", "Panne partenaire ne produit jamais une fausse attestation", 6, "Moyenne", dep="Partenaire fiscal confirmé")
add("V3", "LEG", "LegalTech OHADA", "Écrans LegalTech", "Quota de documents par palier respecté", 2, "Moyenne")

add("V3", "NEG", "Négociation", "Offre et contre-offre structurées et versionnées", "Toutes les versions conservées", 6, "Haute")
add("V3", "NEG", "Négociation", "Générateur de LOI branché sur LegalTech", "LOI générée depuis l'offre acceptée", 4, "Haute", dep="Moteur de génération")
add("V3", "NEG", "Audit d'acquisition", "Registre des points ouverts d'audit d'acquisition (P15)", "Chaque point porte propriétaire, échéance, statut", 6, "Haute")
add("V3", "NEG", "Audit d'acquisition", "Décision poursuivre / renégocier / abandonner avec motifs structurés", "Motif obligatoire à l'abandon", 3, "Moyenne")
add("V3", "NEG", "Négociation", "Écrans négociation et audit", "Conditions sensibles visibles uniquement en T2", 6, "Moyenne")

add("V3", "REA", "Réalisation", "Statut de réalisation (réalisé, différé, abandonné) et dossier de preuves", "Résultat présenté avec son niveau de preuve", 5, "Haute")
add("V3", "REA", "Réalisation", "Références de formalités externes (RCCM) et confirmations des parties", "Référence RCCM stockée avec horodatage", 3, "Moyenne")
add("V3", "REA", "Réalisation", "Création automatique du FeeEvent (PENDING ou SUSPENDED) à l'entrée en CLOSED_REPORTED", "Aucune réalisation sans FeeEvent (test)", 4, "Haute")
add("V3", "REA", "Réalisation", "Écrans réalisation", "Statut lisible par les deux parties", 3, "Moyenne")

add("V3", "FIN", "Finance", "Enregistrement des revenus, catégories contractuelles et attribution", "Chaque revenu rattaché à une catégorie et un canal", 5, "Haute")
add("V3", "FIN", "Finance", "Calcul du revenu net (déductions contractuelles) avec décomposition stockée", "Décomposition auditable ligne par ligne", 5, "Haute")
add("V3", "FIN", "Finance", "Barème de frais par tranche et minimum garanti, sous drapeau juridique DP-RPS-021", "Barème inactif tant que le drapeau est fermé", 5, "Haute", dep="Avis juridique écrit")
add("V3", "FIN", "Finance", "Rétrocession par catégorie (90/10, 50/50, 70/30) et test d'éligibilité", "Transaction non attribuée exclue automatiquement", 6, "Haute")
add("V3", "FIN", "Finance", "Journal de calcul recalculable sans accès au code source", "Recalcul indépendant identique au centime", 5, "Haute")
add("V3", "FIN", "Finance", "Reporting continu, rapport trimestriel archivé, fenêtre de contestation 30 jours", "Rapport immuable après archivage", 6, "Haute")
add("V3", "FIN", "Finance", "Export d'audit scopé (jamais le code ni les données d'autres clients)", "Export vérifié par le contrôle CCI-Togo", 3, "Moyenne")

add("V3", "SUP", "Support", "Système de tickets et sévérités P1 à P4 avec délais contractuels", "Délai d'accusé mesuré par sévérité", 4, "Moyenne")
add("V3", "SUP", "Support", "Accès privilégié motivé, scopé, expirant, avec notification du propriétaire du dossier", "Propriétaire notifié à chaque accès", 4, "Haute")
add("V3", "SUP", "Support", "Mode 'break-glass' journalisé pour l'administration", "Chaque usage journalisé avec motif et approbateur", 2, "Haute")

add("V3", "OPS", "Portes de conformité", "Déclaration IPDCP et autorisation de transfert transfrontalier (G1, G2)", "Récépissés archivés", 5, "Haute", bloquant="Oui")
add("V3", "OPS", "Portes de conformité", "Revue juridique NDA, CGU, politique de confidentialité (G4)", "Avis écrit archivé", 3, "Haute")
add("V3", "OPS", "Portes de conformité", "Avis juridique écrit sur le RPS (G5) et vérification des tests de plafond (G6)", "Avis et rapport de tests archivés", 4, "Haute")
add("V3", "OPS", "Portes de conformité", "Audit du texte d'interface : aucune allégation non prouvée (G7)", "Zéro occurrence de 'sécurisé', 'certifié' non justifiée", 3, "Moyenne")
add("V3", "OPS", "Portes de conformité", "Recalcul indépendant de la rétrocession (G8)", "Rapprochement signé par la Finance", 3, "Moyenne")
add("V3", "OPS", "Portes de conformité", "Nomination du DPO et processus d'effacement (G9)", "DPO nommé, procédure publiée", 2, "Haute")
add("V3", "OPS", "Portes de conformité", "Pentest indépendant et remédiation des constats critiques et élevés (G10)", "Rapport de pentest sans constat critique ouvert", 5, "Haute", bloquant="Oui")

add("V3", "OPS", "Exploitation", "Supervision, alertes, mesure de disponibilité mensuelle (SLA 99,5 %)", "Tableau de disponibilité mensuel généré", 6, "Haute")
add("V3", "OPS", "Exploitation", "Sauvegardes chiffrées et test de restauration (RPO 1 h, RTO 4 h)", "Restauration complète en moins de 4 h documentée", 5, "Haute")
add("V3", "OPS", "Exploitation", "Procédure d'incident, analyse de cause racine, rollback", "Procédure testée sur un incident simulé", 4, "Moyenne")
add("V3", "OPS", "Exploitation", "Rotation des clés, gestion des secrets, scan de dépendances en CI", "Build échoue sur vulnérabilité critique", 5, "Haute")

# ---------------- V4 (102 j/p) ----------------
add("V4", "REB", "Conception", "Conception Alerte & Rebond : confidentialité renforcée, signalement, actifs en difficulté et lien avec le périmètre RPS", "Modèle de données et parcours validés ; aucune fuite d'identité d'une entreprise en difficulté", 3, "Haute", bloquant="Oui")
add("V4", "CNX", "Conception", "Conception Deal-Connect et Guichet Diaspora complets : billetterie et sponsoring via Remo.co, rendez-vous mutuels, profil diaspora, rapport post-événement", "Séquences et contrats d'échange avec Remo.co validés sur la documentation à jour", 2, "Haute")
add("V4", "EXP", "Conception", "Conception Deal-Experts : mobilisation d'expert indépendant, conflit d'intérêts, périmètre de mission, traçabilité", "Décision d'arbitrage (P13) prise et modèle de mission spécifié", 2, "Moyenne", dep="Arbitrage Deal-Experts")
add("V4", "REB", "Alerte & Rebond", "Auto-diagnostic : arbre logique et score de santé financière", "Score expliqué, jamais un conseil personnalisé", 6, "Haute")
add("V4", "REB", "Alerte & Rebond", "Dossier de crise confidentiel, INVITE_ONLY, registre d'investisseurs de retournement", "Dossier absent de toute recherche ouverte (test négatif)", 6, "Haute")
add("V4", "REB", "Alerte & Rebond", "Signalement statutaire (mandataire de justice) et avertissement sur les clauses bancaires", "Avertissement affiché avant tout changement de visibilité", 3, "Moyenne")
add("V4", "REB", "Actifs en difficulté", "Listings d'actifs par catégorie : créances, immobilier, équipement, flotte", "Jeu de champs distinct par catégorie", 7, "Haute")
add("V4", "REB", "Actifs en difficulté", "Coupe-circuit opérateur : retrait immédiat de toutes les surfaces et caches", "Retrait effectif en moins de 60 s", 3, "Haute")
add("V4", "REB", "Alerte & Rebond", "Ingestion des annonces de dissolution / liquidation (flux CFE)", "Flux importé quotidiennement", 5, "Basse")
add("V4", "REB", "Alerte & Rebond", "Écrans Alerte & Rebond", "Confidentialité par défaut sur chaque écran", 5, "Moyenne")

add("V4", "CNX", "Deal-Connect", "Stands, billetterie et sponsoring avec catégorisation des revenus", "Revenus catégorisés pour la rétrocession", 6, "Moyenne")
add("V4", "CNX", "Deal-Connect", "Rendez-vous mutuels opt-in et suggestions par règles", "Aucun rendez-vous sans double accord", 4, "Moyenne")
add("V4", "CNX", "Deal-Connect", "Rapport post-événement : participation, rendez-vous, satisfaction", "Rapport agrégé sans donnée nominative", 4, "Moyenne")
add("V4", "CNX", "Deal-Connect", "Écrans Deal-Connect", "Aucun contenu à caractère de titre financier sur les stands", 5, "Moyenne")

add("V4", "DIA", "Guichet Diaspora", "Profil investisseur diaspora, préférences, liste de suivi", "Preuve de capacité avec date d'expiration", 5, "Haute")
add("V4", "DIA", "Guichet Diaspora", "Présentation des contraintes transfrontalières et taux de change indicatif daté", "Taux affiché avec source et date", 5, "Haute")
add("V4", "DIA", "Guichet Diaspora", "Renvoi vers banque / conseil pour les aspects réglementés", "Aucun conseil de change fourni par la plateforme", 3, "Haute")
add("V4", "DIA", "Guichet Diaspora", "Signal de demande diaspora (agrégé, anonymisé)", "Aucune donnée nominative dans le signal", 3, "Basse")
add("V4", "DIA", "Guichet Diaspora", "Écrans Guichet Diaspora", "Contraintes affichées avant la phase finale", 5, "Moyenne")

add("V4", "EXP", "Deal-Experts", "Registre d'experts qualifiés et déclaration de conflit d'intérêts", "Conflit déclaré avant toute proposition", 5, "Moyenne", dep="Arbitrage statut P13")
add("V4", "EXP", "Deal-Experts", "Routage du besoin, propositions, sélection par le client", "Client choisit seul, DealPME n'oriente pas le fond", 5, "Moyenne")
add("V4", "EXP", "Deal-Experts", "Accès temporaire scopé en lecture, expiration à la remise du livrable", "Accès fermé automatiquement à la livraison", 5, "Haute")
add("V4", "EXP", "Deal-Experts", "Contrat direct client-expert (hors facturation DealPME) et journal", "Aucune facturation de prestation par DealPME", 3, "Moyenne")
add("V4", "EXP", "Deal-Experts", "Écrans Deal-Experts", "Aucun contenu d'expert imputé à DealPME", 2, "Basse")

# ---------------- V5 (153 j/p) ----------------
add("V5", "VDR-IA", "Conception", "Conception VDR Intelligence : pare-feu de divulgation avant récupération, pipeline d'ingestion, indexation filtrée par permission, contrat de réponse avec citations et insuffisance", "Spécification relue sur les 12 cas de référence ; aucune étape 'récupérer puis masquer'", 5, "Haute", bloquant="Oui")
add("V5", "OPS", "Conception", "Revue de sécurité de conception IA : modèle de menaces (injection par document, fuite inter-dossiers, réutilisation des données par le fournisseur)", "Chaque menace reliée à un test QA IA ou à une clause du contrat fournisseur", 3, "Haute")
add("V5", "VDR-IA", "Fournisseur IA", "Qualification et contrat du fournisseur IA (confidentialité, hébergement, aucune réutilisation des données)", "Contrat signé avec clauses de confidentialité", 5, "Haute", bloquant="Oui")
add("V5", "VDR-IA", "Fournisseur IA", "Dossier de conformité IA : politique, drapeaux fonctionnels, journal des politiques", "Chaque changement de politique audité", 5, "Haute")
add("V5", "VDR-IA", "Ingestion", "Pipeline d'ingestion : classification, OCR, ancres de page, empreinte de version", "États UPLOADED à PUBLISHED implémentés", 8, "Haute")
add("V5", "VDR-IA", "Ingestion", "Indexation filtrée par permission (permission_scope_hash)", "Aucun chunk indexé hors périmètre autorisé", 8, "Haute")
add("V5", "VDR-IA", "DealLens", "Pare-feu de divulgation avant récupération (10 étapes, jamais 'récupérer puis masquer')", "Test AI-01 : aucun document inaccessible cité", 8, "Haute")
add("V5", "VDR-IA", "DealLens", "Contrat de réponse DealLens : citations, niveau de confiance, réponse d'insuffisance", "Test AI-04 : INSUFFISANT sans spéculation", 6, "Haute")
add("V5", "VDR-IA", "DealLens", "DealLens mode document et mode salle entière", "Les deux modes journalisent AI_QUERY_COMPLETED", 8, "Haute")
add("V5", "VDR-IA", "DealLens", "Vérification de chaque citation contre l'ensemble autorisé", "Test AI-03 : chaque citation ouvre la bonne page", 5, "Haute")
add("V5", "VDR-IA", "Surfaces", "Cockpit : couverture par domaine, priorités de revue", "Couverture jamais présentée comme un avis d'audit", 6, "Moyenne")
add("V5", "VDR-IA", "Surfaces", "Issue Radar : registre structuré de risques", "Chaque risque porte preuve, propriétaire, impact", 7, "Moyenne")
add("V5", "VDR-IA", "Surfaces", "Evidence Map : graphe typé (SUPPORTS, CONTRADICTS, RAISES, RESOLVES, EVIDENCES)", "Graphe navigable depuis un document", 8, "Moyenne")
add("V5", "VDR-IA", "Surfaces", "Atelier Q&R avec rôles et brouillons IA jamais soumis automatiquement", "Test AI-06 : brouillon reste DRAFT", 7, "Haute")
add("V5", "VDR-IA", "Surfaces", "Engagement Pulse (descriptif, jamais 'probabilité de closing')", "Libellé vérifié par l'audit de texte", 4, "Basse")
add("V5", "VDR-IA", "Surfaces", "Rapprochement financier (Financial Tie-Out) avec matérialité configurable", "Écart présenté comme point de rapprochement", 7, "Moyenne")
add("V5", "VDR-IA", "Surfaces", "Intelligence de version : diff textuel et sémantique, matérialité proposée", "Test DOC-03 : nouvelle version n'hérite pas de l'analyse", 6, "Moyenne")
add("V5", "VDR-IA", "Surfaces", "Caviardage assisté avec revue humaine élément par élément", "Original jamais écrasé", 7, "Moyenne")
add("V5", "VDR-IA", "Accès", "Accès et Clean Team, MFA step-up sur changements de permission", "Test AI-02 : Clean Team exclue de la recherche standard", 6, "Haute")
add("V5", "VDR-IA", "Accès", "Audit append-only sans contenu sensible ni texte de réponse IA", "Journal ne contient que identifiants, action, résultat", 4, "Haute")
add("V5", "VDR-IA", "Surfaces", "Écrans VDR Intelligence (9 surfaces, responsive)", "Mobile : document, DealLens, Q&R prioritaires", 10, "Haute")
add("V5", "VDR-IA", "QA IA", "Tests AI-01 à AI-06, DOC-01 à DOC-03, Q&A-01, UI-01", "Tous les tests P0 passent", 10, "Haute")
add("V5", "VDR-IA", "QA IA", "Performance : viewer progressif, streaming des réponses, recherche < 1,5 s", "Mesures sur réseau de référence", 5, "Moyenne")
add("V5", "VDR-IA", "QA IA", "Recette V5 et corrections", "Zéro anomalie bloquante ouverte", 5, "Haute")

# ------------------------------------------------------------------ contrôle des totaux par version
expected = {"V1": 274, "V2": 190, "V3": 179, "V4": 102, "V5": 153}
totals = {}
for t in T:
    totals[t[0]] = totals.get(t[0], 0) + t[5]
for v, e in expected.items():
    assert totals[v] == e, f"{v}: {totals[v]} != {e}"

# ------------------------------------------------------------------ dates planifiées
vwin = {v[0]: (v[2], v[3]) for v in VERSIONS}
def plan_dates():
    out = []
    cum = {}
    for t in T:
        v = t[0]
        start, end = vwin[v]
        if v == "V1":
            # Décision du 10/09/2026 : développement du 03/09 au 12/10, QA et livraison du 13 au 15/10.
            if t[2] == "QA et livraison":
                out.append((dt.date(2026, 10, 13), dt.date(2026, 10, 15)))
                cum[v] = cum.get(v, 0) + t[5]
                continue
            end = dt.date(2026, 10, 12)
        win = (end - start).days
        before = cum.get(v, 0)
        frac = before / expected[v]
        s = start + dt.timedelta(days=int(round(frac * win * 0.85)))
        dur = max(2, int(math.ceil(t[5] * 1.4)))
        e = min(end, s + dt.timedelta(days=dur))
        out.append((s, e))
        cum[v] = before + t[5]
    return out
DATES = plan_dates()

# ------------------------------------------------------------------ classeur
wb = openpyxl.Workbook()
wb.calculation.fullCalcOnLoad = True

NTASK_ROWS = 320          # lignes réservées dans Taches (formules pré-remplies)
T_FIRST = 6
T_LAST = T_FIRST + NTASK_ROWS - 1

# colonnes Taches
TC = {  # nom -> lettre
    "id": "B", "version": "C", "module": "D", "lot": "E", "tache": "F", "critere": "G",
    "charge": "H", "prio": "I", "statut": "J", "pct": "K", "avancement": "L",
    "charge_ret": "M", "charge_real": "N", "resp": "O", "debut": "P", "fin": "Q",
    "fin_reelle": "R", "dep": "S", "bloquant": "T", "retard": "U", "comment": "V",
}
def rng(col):
    return f"Taches!${TC[col]}${T_FIRST}:${TC[col]}${T_LAST}"

# ================================================================== PARAMETRES
wsP = wb.create_sheet("Parametres")
title(wsP, "Paramètres et listes", "Listes déroulantes et règles de calcul de l'avancement. Modifier ici pour changer les valeurs proposées.")
wsP["B5"] = "Statut"; wsP["C5"] = "Avancement par défaut"; wsP["D5"] = "Compte dans la charge"
head(wsP, 5, 2, 4)
STATUTS = [("À faire", 0, "Oui"), ("En cours", 0.25, "Oui"), ("En revue", 0.9, "Oui"), ("Bloquée", 0.25, "Oui"), ("Complétée", 1, "Oui"), ("Backlog", 0, "Oui"), ("Abandonnée", 0, "Non")]
for i, (s, p, c) in enumerate(STATUTS):
    r = 6 + i
    wsP.cell(row=r, column=2, value=s); wsP.cell(row=r, column=3, value=p); wsP.cell(row=r, column=4, value=c)
    body(wsP, r, 2, 4)
    wsP.cell(row=r, column=3).number_format = "0%"
STAT_RNG = f"Parametres!$B$6:$B${5 + len(STATUTS)}"
STAT_MAP = f"Parametres!$B$6:$C${5 + len(STATUTS)}"

wsP["F5"] = "Priorité"; head(wsP, 5, 6, 6)
for i, p in enumerate(["Haute", "Moyenne", "Basse"]):
    wsP.cell(row=6 + i, column=6, value=p); body(wsP, 6 + i, 6, 6)
PRIO_RNG = "Parametres!$F$6:$F$8"

wsP["H5"] = "Version"; head(wsP, 5, 8, 8)
for i, v in enumerate(VERSIONS):
    wsP.cell(row=6 + i, column=8, value=v[0]); body(wsP, 6 + i, 8, 8)
VER_RNG = f"Parametres!$H$6:$H${5 + len(VERSIONS)}"

wsP["J5"] = "Module (code)"; head(wsP, 5, 10, 10)
for i, m in enumerate(MODULES):
    wsP.cell(row=6 + i, column=10, value=m[0]); body(wsP, 6 + i, 10, 10)
MOD_RNG = f"Parametres!$J$6:$J${5 + len(MODULES)}"

wsP["L5"] = "Oui / Non"; head(wsP, 5, 12, 12)
wsP["L6"] = "Oui"; wsP["L7"] = "Non"; body(wsP, 6, 12, 12); body(wsP, 7, 12, 12)
OUINON_RNG = "Parametres!$L$6:$L$7"

wsP["N5"] = "Statut jalon"; head(wsP, 5, 14, 14)
for i, s in enumerate(["À venir", "En risque", "Atteint", "Abandonné"]):
    wsP.cell(row=6 + i, column=14, value=s); body(wsP, 6 + i, 14, 14)
JAL_RNG = "Parametres!$N$6:$N$9"

wsP["P5"] = "Statut risque"; head(wsP, 5, 16, 16)
for i, s in enumerate(["Ouvert", "Surveillé", "Clos"]):
    wsP.cell(row=6 + i, column=16, value=s); body(wsP, 6 + i, 16, 16)
RSK_RNG = "Parametres!$P$6:$P$8"

wsP["R5"] = "Statut décision"; head(wsP, 5, 18, 18)
for i, s in enumerate(["Ouvert", "En discussion", "Tranché"]):
    wsP.cell(row=6 + i, column=18, value=s); body(wsP, 6 + i, 18, 18)
DEC_RNG = "Parametres!$R$6:$R$8"

wsP["B15"] = "Règle d'avancement d'une tâche"; wsP["B15"].font = F_LABEL
wsP["B16"] = "Si le statut est 'Complétée' : 100 %. Si un pourcentage est saisi dans la colonne '% saisi' de l'onglet Taches, il est utilisé. Sinon, l'avancement par défaut du statut ci-dessus s'applique."
wsP["B17"] = "Une tâche 'Abandonnée' sort des totaux de charge. La charge réalisée = charge retenue x avancement. Les modules, versions, processus et le tableau de bord sont calculés à partir de ces deux colonnes."
for r in (16, 17):
    wsP.cell(row=r, column=2).font = F_NORMAL; wsP.cell(row=r, column=2).alignment = A_WRAP
    wsP.merge_cells(start_row=r, start_column=2, end_row=r, end_column=18)
    wsP.row_dimensions[r].height = 32
widths(wsP, [3, 14, 20, 20, 3, 12, 3, 10, 3, 14, 3, 10, 3, 14, 3, 14, 3, 16])

# ================================================================== TACHES
wsT = wb.create_sheet("Taches")
title(wsT, "Tâches détaillées", "Source unique de vérité. Colonnes jaunes : à saisir. Colonnes grises : calculées, ne pas modifier. Filtrer avec les en-têtes.")
headers = ["ID", "Version", "Module", "Lot", "Tâche", "Critère de fin", "Charge (j/p)", "Priorité", "Statut",
           "% saisi (optionnel)", "Avancement", "Charge retenue", "Charge réalisée", "Responsable",
           "Début prévu", "Fin prévue", "Fin réelle", "Dépendances", "Bloquant", "Retard", "Commentaire"]
for i, h in enumerate(headers):
    wsT.cell(row=5, column=2 + i, value=h)
head(wsT, 5, 2, 2 + len(headers) - 1, height=32)

counters = {}
for idx in range(NTASK_ROWS):
    r = T_FIRST + idx
    if idx < len(T):
        v, m, lot, tache, crit, ch, prio, statut, bloquant, dep = T[idx]
        counters[v] = counters.get(v, 0) + 1
        tid = f"{v}-{counters[v]:03d}"
        s, e = DATES[idx]
        pct, fin_reelle, resp, comment = None, None, None, None
        for prefix, (st, p, done) in PROGRESS.items():
            if tache.startswith(prefix):
                statut, pct, fin_reelle, resp = st, p, done, DEFAULT_OWNER
                comment = None
                break
        # Une fin réelle n'est jamais antérieure au début prévu : elle tombe dans l'intervalle prévu ou après,
        # même si cela la place dans le futur (la colonne est masquée par défaut).
        if fin_reelle is not None and fin_reelle < s:
            fin_reelle = e
        vals = {"id": tid, "version": v, "module": m, "lot": lot, "tache": tache, "critere": crit,
                "charge": ch, "prio": prio, "statut": statut, "pct": pct, "resp": resp,
                "debut": s, "fin": e, "fin_reelle": fin_reelle, "dep": dep, "bloquant": bloquant, "comment": comment}
        for k, val in vals.items():
            wsT[f"{TC[k]}{r}"] = val
    # formules (présentes même sur lignes vides pour permettre l'ajout de tâches)
    J, K, H, M, L, Q = f"J{r}", f"K{r}", f"H{r}", f"M{r}", f"L{r}", f"Q{r}"
    wsT[f"L{r}"] = f'=IF($B{r}="","",IF({J}="Complétée",1,IF({J}="Abandonnée",0,IF({K}<>"",{K},IFERROR(VLOOKUP({J},{STAT_MAP},2,FALSE),0)))))'
    wsT[f"M{r}"] = f'=IF($B{r}="","",IF({J}="Abandonnée",0,{H}))'
    wsT[f"N{r}"] = f'=IF($B{r}="","",{M}*{L})'
    wsT[f"U{r}"] = f'=IF($B{r}="","",IF(AND({J}<>"Complétée",{J}<>"Abandonnée",{Q}<>"",TODAY()>{Q}),"En retard",""))'
    body(wsT, r, 2, 22)
    for col in ("charge", "prio", "statut", "pct", "resp", "debut", "fin", "fin_reelle", "dep", "bloquant", "comment", "version", "module", "lot", "tache", "critere", "id"):
        wsT[f"{TC[col]}{r}"].fill = FILL_INPUT
    for col in ("avancement", "charge_ret", "charge_real", "retard"):
        wsT[f"{TC[col]}{r}"].fill = FILL_CALC
    wsT[f"L{r}"].number_format = "0%"
    wsT[f"K{r}"].number_format = "0%"
    for col in ("charge", "charge_ret", "charge_real"):
        wsT[f"{TC[col]}{r}"].number_format = "0.0"
        wsT[f"{TC[col]}{r}"].alignment = A_CENTER
    for col in ("debut", "fin", "fin_reelle"):
        wsT[f"{TC[col]}{r}"].number_format = "DD/MM/YYYY"
        wsT[f"{TC[col]}{r}"].alignment = A_CENTER
    for col in ("id", "version", "module", "prio", "statut", "pct", "avancement", "bloquant"):
        wsT[f"{TC[col]}{r}"].alignment = A_CENTER

# validations
for col, src in (("statut", STAT_RNG), ("prio", PRIO_RNG), ("version", VER_RNG), ("module", MOD_RNG), ("bloquant", OUINON_RNG)):
    dv = DataValidation(type="list", formula1=f"={src}", allow_blank=True)
    wsT.add_data_validation(dv)
    dv.add(f"{TC[col]}{T_FIRST}:{TC[col]}{T_LAST}")
dv_pct = DataValidation(type="decimal", operator="between", formula1="0", formula2="1", allow_blank=True)
wsT.add_data_validation(dv_pct); dv_pct.add(f"K{T_FIRST}:K{T_LAST}")

# ================================================================== EQUIPE
wsE = wb.create_sheet("Equipe")
title(wsE, "Équipe projet", "Chaque développeur s'inscrit ici (colonnes jaunes). Son nom devient alors sélectionnable dans la colonne Responsable de l'onglet Taches. Charges et avancement calculés.")
E_FIRST = 6
E_ROWS = 40
E_LAST = E_FIRST + E_ROWS - 1
hE = ["Nom complet", "Rôle", "Organisation", "Contact", "Disponibilité", "Arrivée", "Actif",
      "Tâches assignées", "Charge assignée (j/p)", "Charge réalisée (j/p)", "Avancement", "En cours", "Bloquées", "En retard", "Complétées", "Charge restante (j/p)", "Commentaire"]
for i, h in enumerate(hE):
    wsE.cell(row=5, column=2 + i, value=h)
head(wsE, 5, 2, 2 + len(hE) - 1, height=32)
EQUIPE_INIT = [
    ("Abdou-Raouf", "Chef de projet / architecte", "DealPME", "", 1.0, dt.date(2026, 9, 9), "Oui", "Pilotage, architecture, revue de code"),
]
for idx in range(E_ROWS):
    r = E_FIRST + idx
    if idx < len(EQUIPE_INIT):
        nom, role, org, contact, dispo, arr, actif, com = EQUIPE_INIT[idx]
        wsE[f"B{r}"], wsE[f"C{r}"], wsE[f"D{r}"], wsE[f"E{r}"], wsE[f"F{r}"], wsE[f"G{r}"], wsE[f"H{r}"], wsE[f"R{r}"] = nom, role, org, contact, dispo, arr, actif, com
    RESP = rng("resp")
    wsE[f"I{r}"] = f'=IF($B{r}="","",COUNTIFS({RESP},$B{r},{rng("statut")},"<>Abandonnée"))'
    wsE[f"J{r}"] = f'=IF($B{r}="","",SUMIF({RESP},$B{r},{rng("charge_ret")}))'
    wsE[f"K{r}"] = f'=IF($B{r}="","",SUMIF({RESP},$B{r},{rng("charge_real")}))'
    wsE[f"L{r}"] = f'=IF(OR($B{r}="",J{r}=0),"",K{r}/J{r})'
    wsE[f"M{r}"] = f'=IF($B{r}="","",COUNTIFS({RESP},$B{r},{rng("statut")},"En cours")+COUNTIFS({RESP},$B{r},{rng("statut")},"En revue"))'
    wsE[f"N{r}"] = f'=IF($B{r}="","",COUNTIFS({RESP},$B{r},{rng("statut")},"Bloquée"))'
    wsE[f"O{r}"] = f'=IF($B{r}="","",COUNTIFS({RESP},$B{r},{rng("retard")},"En retard"))'
    wsE[f"P{r}"] = f'=IF($B{r}="","",COUNTIFS({RESP},$B{r},{rng("statut")},"Complétée"))'
    wsE[f"Q{r}"] = f'=IF($B{r}="","",J{r}-K{r})'
    body(wsE, r, 2, 18)
    for c in "BCDEFGHR":
        wsE[f"{c}{r}"].fill = FILL_INPUT
    for c in "IJKLMNOPQ":
        wsE[f"{c}{r}"].fill = FILL_CALC; wsE[f"{c}{r}"].alignment = A_CENTER
    wsE[f"F{r}"].number_format = "0%"; wsE[f"F{r}"].alignment = A_CENTER
    wsE[f"G{r}"].number_format = "DD/MM/YYYY"; wsE[f"G{r}"].alignment = A_CENTER
    wsE[f"H{r}"].alignment = A_CENTER
    wsE[f"L{r}"].number_format = "0%"
    for c in "JKQ":
        wsE[f"{c}{r}"].number_format = "0.0"
r = E_LAST + 1
wsE[f"B{r}"] = "Total équipe"
for c in "IJKMNOPQ":
    wsE[f"{c}{r}"] = f"=SUM({c}{E_FIRST}:{c}{E_LAST})"
wsE[f"L{r}"] = f"=IF(J{r}=0,0,K{r}/J{r})"
for c in range(2, 19):
    cell = wsE.cell(row=r, column=c); cell.border = BORDER; cell.fill = PatternFill("solid", fgColor=PAPER); cell.font = F_BOLD; cell.alignment = A_CENTER
wsE[f"L{r}"].number_format = "0%"
for c in "JKQ":
    wsE[f"{c}{r}"].number_format = "0.0"
E_TOTAL = r
r += 2
wsE[f"B{r}"] = "Tâches sans responsable"; wsE[f"B{r}"].font = F_LABEL
wsE[f"C{r}"] = f'=COUNTIFS({rng("id")},"<>",{rng("resp")},"",{rng("statut")},"<>Abandonnée")'; wsE[f"C{r}"].font = F_BOLD; wsE[f"C{r}"].alignment = A_CENTER
E_UNASSIGNED = f"Equipe!$C${r}"
r += 1
wsE[f"B{r}"] = "Charge non assignée (j/p)"; wsE[f"B{r}"].font = F_LABEL
wsE[f"C{r}"] = f'=SUMIFS({rng("charge_ret")},{rng("resp")},"",{rng("statut")},"<>Abandonnée")'; wsE[f"C{r}"].font = F_BOLD; wsE[f"C{r}"].alignment = A_CENTER; wsE[f"C{r}"].number_format = "0.0"
E_UNASSIGNED_CH = f"Equipe!$C${r}"
ROLE_LIST = '"Chef de projet / architecte,Développeur backend,Développeur frontend,Développeur full-stack,DevOps / SRE,QA / testeur,Designer UI/UX,Juridique / DPO,Référent CCI-Togo,Propriétaire produit,Autre"'
dvr = DataValidation(type="list", formula1=ROLE_LIST, allow_blank=True); wsE.add_data_validation(dvr); dvr.add(f"C{E_FIRST}:C{E_LAST}")
dva = DataValidation(type="list", formula1=f"={OUINON_RNG}", allow_blank=True); wsE.add_data_validation(dva); dva.add(f"H{E_FIRST}:H{E_LAST}")
dvdisp = DataValidation(type="decimal", operator="between", formula1="0", formula2="1", allow_blank=True); wsE.add_data_validation(dvdisp); dvdisp.add(f"F{E_FIRST}:F{E_LAST}")
wsE.conditional_formatting.add(f"L{E_FIRST}:L{E_LAST}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color=ACCENT))
wsE.conditional_formatting.add(f"N{E_FIRST}:O{E_LAST}", FormulaRule(formula=[f'AND(N{E_FIRST}<>"",N{E_FIRST}>0)'], font=Font(color=DANGER, bold=True)))
wsE.conditional_formatting.add(f"H{E_FIRST}:H{E_LAST}", FormulaRule(formula=[f'H{E_FIRST}="Non"'], fill=PatternFill("solid", fgColor=PAPER), font=Font(color=STEEL)))
widths(wsE, [3, 24, 24, 14, 22, 11, 11, 7, 10, 11, 11, 11, 9, 9, 9, 10, 12, 30])
wsE.freeze_panes = "C6"
EQUIPE_NAMES = f"Equipe!$B${E_FIRST}:$B${E_LAST}"

# Responsable des tâches : liste des personnes inscrites dans Equipe
dv_resp = DataValidation(type="list", formula1=f"={EQUIPE_NAMES}", allow_blank=True)
wsT.add_data_validation(dv_resp); dv_resp.add(f"O{T_FIRST}:O{T_LAST}")

# mise en forme conditionnelle
SR = f"J{T_FIRST}:J{T_LAST}"
wsT.conditional_formatting.add(SR, FormulaRule(formula=[f'J{T_FIRST}="Complétée"'], fill=PatternFill("solid", fgColor=OK_BG), font=Font(color=OK, bold=True)))
wsT.conditional_formatting.add(SR, FormulaRule(formula=[f'J{T_FIRST}="En cours"'], fill=PatternFill("solid", fgColor=WARN_BG), font=Font(color=WARN, bold=True)))
wsT.conditional_formatting.add(SR, FormulaRule(formula=[f'J{T_FIRST}="En revue"'], fill=PatternFill("solid", fgColor=INFO_BG)))
wsT.conditional_formatting.add(SR, FormulaRule(formula=[f'J{T_FIRST}="Bloquée"'], fill=PatternFill("solid", fgColor=DANGER_BG), font=Font(color=DANGER, bold=True)))
wsT.conditional_formatting.add(f"U{T_FIRST}:U{T_LAST}", FormulaRule(formula=[f'U{T_FIRST}="En retard"'], fill=PatternFill("solid", fgColor=DANGER_BG), font=Font(color=DANGER, bold=True)))
wsT.conditional_formatting.add(f"T{T_FIRST}:T{T_LAST}", FormulaRule(formula=[f'T{T_FIRST}="Oui"'], font=Font(color=DANGER, bold=True)))
wsT.conditional_formatting.add(f"L{T_FIRST}:L{T_LAST}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color=ACCENT))

widths(wsT, [3, 9, 8, 8, 18, 52, 44, 9, 9, 10, 10, 10, 9, 9, 14, 11, 11, 11, 22, 9, 10, 30])
wsT.freeze_panes = "G6"
wsT.auto_filter.ref = f"B5:V{T_LAST}"

# ================================================================== MODULES
wsM = wb.create_sheet("Modules")
title(wsM, "Modules fonctionnels", "Avancement calculé automatiquement depuis les tâches (pondéré par la charge). Seules les colonnes Responsable et Commentaire se saisissent.")
hM = ["Code", "Module", "Catégorie", "Processus liés", "Version cible", "Charge (j/p)", "Réalisé (j/p)", "Avancement",
      "Tâches", "Faites", "En cours", "Bloquées", "En retard", "État", "Responsable", "Commentaire"]
for i, h in enumerate(hM):
    wsM.cell(row=5, column=2 + i, value=h)
head(wsM, 5, 2, 2 + len(hM) - 1, height=30)
CAT_FILL = {"Socle V0": OK_BG, "Partenaire-dépendant": WARN_BG, "Extension conçue, non prod": INFO_BG,
            "Arbitrage requis": WARN_BG, "Hors périmètre v0": DANGER_BG, "Différé (P2)": DANGER_BG}
M_FIRST = 6
for i, m in enumerate(MODULES):
    r = M_FIRST + i
    code, nom, cat, procs, ver, com = m
    wsM[f"B{r}"], wsM[f"C{r}"], wsM[f"D{r}"], wsM[f"E{r}"], wsM[f"F{r}"] = code, nom, cat, procs, ver
    wsM[f"G{r}"] = f'=SUMIF({rng("module")},$B{r},{rng("charge_ret")})'
    wsM[f"H{r}"] = f'=SUMIF({rng("module")},$B{r},{rng("charge_real")})'
    wsM[f"I{r}"] = f'=IF(G{r}=0,0,H{r}/G{r})'
    wsM[f"J{r}"] = f'=COUNTIFS({rng("module")},$B{r},{rng("statut")},"<>Annulé",{rng("id")},"<>")'
    wsM[f"K{r}"] = f'=COUNTIFS({rng("module")},$B{r},{rng("statut")},"Complétée")'
    wsM[f"L{r}"] = f'=COUNTIFS({rng("module")},$B{r},{rng("statut")},"En cours")+COUNTIFS({rng("module")},$B{r},{rng("statut")},"En revue")'
    wsM[f"M{r}"] = f'=COUNTIFS({rng("module")},$B{r},{rng("statut")},"Bloquée")'
    wsM[f"N{r}"] = f'=COUNTIFS({rng("module")},$B{r},{rng("retard")},"En retard")'
    wsM[f"O{r}"] = f'=IF(J{r}=0,"Sans tâche",IF(I{r}>=0.999,"Terminé",IF(M{r}>0,"Bloqué (partiel)",IF(I{r}=0,"Non démarré","En cours"))))'
    wsM[f"Q{r}"] = com
    body(wsM, r, 2, 17)
    wsM[f"D{r}"].fill = PatternFill("solid", fgColor=CAT_FILL.get(cat, WHITE))
    for c in "GHIJKLMNO":
        wsM[f"{c}{r}"].fill = FILL_CALC; wsM[f"{c}{r}"].alignment = A_CENTER
    wsM[f"P{r}"].fill = FILL_INPUT; wsM[f"Q{r}"].fill = FILL_INPUT
    wsM[f"I{r}"].number_format = "0%"
    wsM[f"G{r}"].number_format = "0"; wsM[f"H{r}"].number_format = "0.0"
M_LAST = M_FIRST + len(MODULES) - 1
r = M_LAST + 1
wsM[f"B{r}"] = "Total"; wsM[f"B{r}"].font = F_BOLD
wsM[f"G{r}"] = f"=SUM(G{M_FIRST}:G{M_LAST})"; wsM[f"H{r}"] = f"=SUM(H{M_FIRST}:H{M_LAST})"
wsM[f"I{r}"] = f"=IF(G{r}=0,0,H{r}/G{r})"
for c in "JKLMN":
    wsM[f"{c}{r}"] = f"=SUM({c}{M_FIRST}:{c}{M_LAST})"
for c in range(2, 18):
    cell = wsM.cell(row=r, column=c); cell.border = BORDER; cell.fill = PatternFill("solid", fgColor=PAPER); cell.font = F_BOLD; cell.alignment = A_CENTER
wsM[f"I{r}"].number_format = "0%"; wsM[f"H{r}"].number_format = "0.0"
M_TOTAL = r
wsM.conditional_formatting.add(f"I{M_FIRST}:I{M_LAST}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color=ACCENT))
wsM.conditional_formatting.add(f"O{M_FIRST}:O{M_LAST}", FormulaRule(formula=[f'O{M_FIRST}="Terminé"'], fill=PatternFill("solid", fgColor=OK_BG), font=Font(color=OK, bold=True)))
wsM.conditional_formatting.add(f"O{M_FIRST}:O{M_LAST}", FormulaRule(formula=[f'O{M_FIRST}="Bloqué (partiel)"'], fill=PatternFill("solid", fgColor=DANGER_BG), font=Font(color=DANGER, bold=True)))
wsM.conditional_formatting.add(f"O{M_FIRST}:O{M_LAST}", FormulaRule(formula=[f'O{M_FIRST}="En cours"'], fill=PatternFill("solid", fgColor=WARN_BG)))
wsM.conditional_formatting.add(f"M{M_FIRST}:N{M_LAST}", FormulaRule(formula=[f'M{M_FIRST}>0'], font=Font(color=DANGER, bold=True)))

r = M_TOTAL + 3
wsM[f"B{r}"] = "Hors périmètre v0 et éléments en dormance (aucune tâche, pour mémoire)"; wsM[f"B{r}"].font = F_LABEL
r += 1
for name, cat, com in HORS_PERIMETRE:
    wsM[f"C{r}"] = name; wsM[f"D{r}"] = cat; wsM[f"Q{r}"] = com
    body(wsM, r, 2, 17, fill=PAPER)
    wsM[f"D{r}"].fill = PatternFill("solid", fgColor=CAT_FILL.get(cat, WHITE))
    r += 1
widths(wsM, [3, 8, 44, 20, 12, 16, 10, 10, 11, 8, 8, 8, 8, 8, 14, 16, 40])
wsM.freeze_panes = "D6"

# ================================================================== VERSIONS
wsV = wb.create_sheet("Versions")
title(wsV, "Versions", "Avancement, charges et retards calculés depuis les tâches. Les dates de début et de fin se saisissent ici et pilotent les jalons.")
hV = ["Version", "Objet", "Début prévu", "Fin prévue", "Jours restants", "Charge (j/p)", "Charge (sem.)", "Réalisé (j/p)", "Avancement",
      "Tâches", "Faites", "En cours", "Bloquées", "En retard", "État"]
for i, h in enumerate(hV):
    wsV.cell(row=5, column=2 + i, value=h)
head(wsV, 5, 2, 2 + len(hV) - 1, height=30)
V_FIRST = 6
for i, v in enumerate(VERSIONS):
    r = V_FIRST + i
    code, objet, d1, d2 = v
    wsV[f"B{r}"], wsV[f"C{r}"], wsV[f"D{r}"], wsV[f"E{r}"] = code, objet, d1, d2
    wsV[f"F{r}"] = f'=E{r}-TODAY()'
    wsV[f"G{r}"] = f'=SUMIF({rng("version")},$B{r},{rng("charge_ret")})'
    wsV[f"H{r}"] = f'=G{r}/5'
    wsV[f"I{r}"] = f'=SUMIF({rng("version")},$B{r},{rng("charge_real")})'
    wsV[f"J{r}"] = f'=IF(G{r}=0,0,I{r}/G{r})'
    wsV[f"K{r}"] = f'=COUNTIFS({rng("version")},$B{r},{rng("statut")},"<>Annulé",{rng("id")},"<>")'
    wsV[f"L{r}"] = f'=COUNTIFS({rng("version")},$B{r},{rng("statut")},"Complétée")'
    wsV[f"M{r}"] = f'=COUNTIFS({rng("version")},$B{r},{rng("statut")},"En cours")+COUNTIFS({rng("version")},$B{r},{rng("statut")},"En revue")'
    wsV[f"N{r}"] = f'=COUNTIFS({rng("version")},$B{r},{rng("statut")},"Bloquée")'
    wsV[f"O{r}"] = f'=COUNTIFS({rng("version")},$B{r},{rng("retard")},"En retard")'
    wsV[f"P{r}"] = f'=IF(J{r}>=0.999,"Livrée",IF(AND(TODAY()>E{r},J{r}<0.999),"En dépassement",IF(J{r}=0,IF(TODAY()>=D{r},"À démarrer","Planifiée"),"En cours")))'
    body(wsV, r, 2, 16)
    for c in "DE":
        wsV[f"{c}{r}"].fill = FILL_INPUT; wsV[f"{c}{r}"].number_format = "DD/MM/YYYY"; wsV[f"{c}{r}"].alignment = A_CENTER
    for c in "FGHIJKLMNOP":
        wsV[f"{c}{r}"].fill = FILL_CALC; wsV[f"{c}{r}"].alignment = A_CENTER
    wsV[f"J{r}"].number_format = "0%"; wsV[f"H{r}"].number_format = "0.0"; wsV[f"I{r}"].number_format = "0.0"; wsV[f"G{r}"].number_format = "0"
    wsV.row_dimensions[r].height = 30
V_LAST = V_FIRST + len(VERSIONS) - 1
r = V_LAST + 1
wsV[f"B{r}"] = "Total"
for c in "GHIKLMNO":
    wsV[f"{c}{r}"] = f"=SUM({c}{V_FIRST}:{c}{V_LAST})"
wsV[f"J{r}"] = f"=IF(G{r}=0,0,I{r}/G{r})"
for c in range(2, 17):
    cell = wsV.cell(row=r, column=c); cell.border = BORDER; cell.fill = PatternFill("solid", fgColor=PAPER); cell.font = F_BOLD; cell.alignment = A_CENTER
wsV[f"J{r}"].number_format = "0%"; wsV[f"H{r}"].number_format = "0.0"; wsV[f"I{r}"].number_format = "0.0"
V_TOTAL = r
wsV.conditional_formatting.add(f"J{V_FIRST}:J{V_LAST}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color=ACCENT))
wsV.conditional_formatting.add(f"P{V_FIRST}:P{V_LAST}", FormulaRule(formula=[f'P{V_FIRST}="Livrée"'], fill=PatternFill("solid", fgColor=OK_BG), font=Font(color=OK, bold=True)))
wsV.conditional_formatting.add(f"P{V_FIRST}:P{V_LAST}", FormulaRule(formula=[f'P{V_FIRST}="En dépassement"'], fill=PatternFill("solid", fgColor=DANGER_BG), font=Font(color=DANGER, bold=True)))
wsV.conditional_formatting.add(f"P{V_FIRST}:P{V_LAST}", FormulaRule(formula=[f'P{V_FIRST}="En cours"'], fill=PatternFill("solid", fgColor=WARN_BG)))
wsV.conditional_formatting.add(f"F{V_FIRST}:F{V_LAST}", FormulaRule(formula=[f'AND(F{V_FIRST}<0,P{V_FIRST}<>"Livrée")'], font=Font(color=DANGER, bold=True)))
widths(wsV, [3, 9, 58, 12, 12, 10, 10, 10, 11, 11, 8, 8, 9, 9, 9, 15])
wsV.freeze_panes = "D6"

# ================================================================== PROCESSUS
wsPr = wb.create_sheet("Processus")
title(wsPr, "Référentiel de processus P04 à P25", "Chaque processus contractuel est rattaché à son module principal ; l'avancement est hérité du module.")
PROCS = [
    ("P04", "A. Préparer la transmission", "Pass Transmission : constitution et qualification du dossier cédant", "Responsable Opérations DealPME", "MKT"),
    ("P05", "A. Préparer la transmission", "Évaluation financière sommaire et non opposable", "Responsable Produit DealPME", "MKT"),
    ("P06", "A. Préparer la transmission", "Deal-Ready : diagnostic, remédiation et certification CCI-Togo", "Responsable Institutionnel CCI-Togo", "CCI"),
    ("P07", "A. Préparer la transmission", "Qualification du mode de transmission et régime de confidentialité", "Responsable Conformité DealPME", "RPS"),
    ("P08", "B. Qualifier et connecter", "Qualification du repreneur / investisseur", "Responsable Conformité DealPME", "IDN"),
    ("P09", "B. Qualifier et connecter", "Recherche, matching et manifestation d'intérêt", "Responsable Produit DealPME", "MKT"),
    ("P10", "B. Qualifier et connecter", "Admission et divulgation contrôlée", "Responsable Conformité DealPME", "RPS"),
    ("P11", "B. Qualifier et connecter", "NDA, signature et constitution de la preuve", "Responsable Juridique et Conformité DealPME", "SIG"),
    ("P12", "B. Qualifier et connecter", "VDR, autorisation d'accès et questions-réponses", "Responsable Produit et Sécurité DealPME", "VDR"),
    ("P13", "B. Qualifier et connecter", "Mobilisation et gestion d'un expert indépendant", "Responsable Marketplace Services DealPME", "EXP"),
    ("P14", "C. Négocier et réaliser", "Offre, contre-offre, LOI et documentation", "Responsable Transaction Workflow DealPME", "NEG"),
    ("P15", "C. Négocier et réaliser", "Audit d'acquisition et résolution des points ouverts", "Responsable Transaction Workflow DealPME", "NEG"),
    ("P16", "C. Négocier et réaliser", "Réalisation de l'opération et traçabilité de la transmission", "Responsable Transaction Workflow DealPME", "REA"),
    ("P17", "D. Restructurer et servir", "Alerte & Rebond : diagnostic, confidentialité et orientation", "Responsable Alerte & Rebond DealPME", "REB"),
    ("P18", "D. Restructurer et servir", "Cession d'actifs d'entreprises en difficulté", "Responsable Alerte & Rebond DealPME", "REB"),
    ("P19", "D. Restructurer et servir", "Legal-Tech OHADA et Conformité & Fiscalité", "Responsable Modules Partenaires DealPME", "LEG"),
    ("P20", "D. Restructurer et servir", "Deal-Connect : conception et exécution d'un événement B2B", "Référent Opérationnel CCI-Togo", "CNX"),
    ("P21", "D. Restructurer et servir", "Guichet Diaspora et Investissement", "Responsable Guichet Diaspora DealPME", "DIA"),
    ("P22", "E. Gouverner et opérer", "Gouvernance institutionnelle CCI-Togo et certification", "Référent Décisionnel CCI-Togo", "GOV"),
    ("P23", "E. Gouverner et opérer", "Support, administration et accès privilégiés", "Responsable Support DealPME", "SUP"),
    ("P24", "E. Gouverner et opérer", "Résultat, facturation, rétrocession et contrôle financier", "Responsable Finance DealPME", "FIN"),
    ("P25", "E. Gouverner et opérer", "Exploitation, sécurité, incidents, continuité et SLA", "Responsable Technique DealPME", "OPS"),
]
hPr = ["Code", "Bloc", "Processus", "Propriétaire (référentiel)", "Module principal", "Version cible", "Avancement module", "État module"]
for i, h in enumerate(hPr):
    wsPr.cell(row=5, column=2 + i, value=h)
head(wsPr, 5, 2, 9, height=30)
for i, p in enumerate(PROCS):
    r = 6 + i
    wsPr[f"B{r}"], wsPr[f"C{r}"], wsPr[f"D{r}"], wsPr[f"E{r}"], wsPr[f"F{r}"] = p
    wsPr[f"G{r}"] = f'=IFERROR(VLOOKUP($F{r},Modules!$B${M_FIRST}:$Q${M_LAST},5,FALSE),"")'
    wsPr[f"H{r}"] = f'=IFERROR(VLOOKUP($F{r},Modules!$B${M_FIRST}:$Q${M_LAST},8,FALSE),0)'
    wsPr[f"I{r}"] = f'=IFERROR(VLOOKUP($F{r},Modules!$B${M_FIRST}:$Q${M_LAST},14,FALSE),"")'
    body(wsPr, r, 2, 9)
    for c in "GHI":
        wsPr[f"{c}{r}"].fill = FILL_CALC; wsPr[f"{c}{r}"].alignment = A_CENTER
    wsPr[f"H{r}"].number_format = "0%"
    wsPr[f"B{r}"].alignment = A_CENTER; wsPr[f"F{r}"].alignment = A_CENTER
PR_LAST = 5 + len(PROCS)
wsPr.conditional_formatting.add(f"H6:H{PR_LAST}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color=ACCENT))
widths(wsPr, [3, 7, 24, 52, 36, 12, 16, 12, 16])
wsPr.freeze_panes = "D6"

# ================================================================== JALONS
wsJ = wb.create_sheet("Jalons")
title(wsJ, "Jalons", "Dates cibles et statut à saisir ; jours restants, avancement de la version et alerte de dépassement sont calculés.")
JALONS = [
    ("J01", "Confirmation de l'équipe de développement par M. Bruno", "V1", dt.date(2026, 9, 14), "À venir", "Conditionne la tenue du périmètre V1"),
    ("J02", "Réponse sur la disponibilité d'une API CFE / RCCM", "V1", dt.date(2026, 9, 16), "À venir", "Sinon saisie manuelle supervisée"),
    ("J03", "Gel du périmètre V1", "V1", dt.date(2026, 9, 18), "À venir", "Plus aucun ajout après cette date"),
    ("J04", "Designer UI/UX confirmé", "V1", dt.date(2026, 9, 18), "À venir", "Proposition Bouley à confirmer"),
    ("J05", "Recette interne V1 terminée", "V1", dt.date(2026, 10, 14), "À venir", "Zéro anomalie bloquante ; QA du 13 au 15/10"),
    ("J06", "Fin de développement V1 (hors QA)", "V1", dt.date(2026, 10, 12), "À venir", "Le développement s'arrête, la QA prend le relais du 13 au 15/10"),
    ("J07", "Démonstration V1 à M. Bruno et à la CCI-Togo", "V1", dt.date(2026, 10, 15), "À venir", "Échéance ferme"),
    ("J08", "Contrat prestataire de signature qualifiée (PSC) signé", "V2", dt.date(2026, 10, 30), "À venir", "Bloquant pour l'intégration NDA"),
    ("J19", "Pentest indépendant commandé", "V2", dt.date(2026, 11, 10), "À venir", "Doit être réalisé avant la fermeture des portes en V3"),
    ("J09", "Livraison V2", "V2", dt.date(2026, 11, 25), "À venir", "Date fixée le 10/09/2026"),
    ("J10", "Avis juridique écrit sur le RPS et le barème de frais", "V3", dt.date(2026, 12, 11), "À venir", "Conditionne l'activation du barème"),
    ("J11", "Pentest indépendant réalisé et remédié", "V3", dt.date(2026, 12, 18), "À venir", "Porte G10"),
    ("J12", "Portes de conformité G1 à G10 fermées", "V3", dt.date(2026, 12, 23), "À venir", "Condition de lancement commercial"),
    ("J13", "Livraison V3", "V3", dt.date(2026, 12, 30), "À venir", "Date fixée le 10/09/2026"),
    ("J14", "Cadrage de l'intégration Remo.co validé", "V1", dt.date(2026, 9, 18), "À venir", "Bloque le connecteur Remo"),
    ("J15", "Livraison V4", "V4", dt.date(2027, 2, 5), "À venir", "Date fixée le 10/09/2026"),
    ("J16", "Contrat fournisseur IA signé", "V5", dt.date(2027, 1, 15), "À venir", "Bloquant pour DealLens ; consultation à lancer dès V2"),
    ("J17", "Livraison V5", "V5", dt.date(2027, 2, 28), "À venir", "Date fixée le 10/09/2026"),
    ("J18", "Mise en service complète (lancement commercial)", "V5", dt.date(2027, 3, 1), "À venir", "Exige les portes G1 à G10 fermées (J12) et le pentest remédié (J11)"),
]
hJ = ["ID", "Jalon", "Version", "Date cible", "Statut", "Jours restants", "Avancement version", "Alerte", "Prochain (calcul)", "Commentaire"]
for i, h in enumerate(hJ):
    wsJ.cell(row=5, column=2 + i, value=h)
head(wsJ, 5, 2, 11, height=30)
J_FIRST = 6
for i, j in enumerate(JALONS):
    r = J_FIRST + i
    jid, nom, ver, date, st, com = j
    wsJ[f"B{r}"], wsJ[f"C{r}"], wsJ[f"D{r}"], wsJ[f"E{r}"], wsJ[f"F{r}"], wsJ[f"K{r}"] = jid, nom, ver, date, st, com
    wsJ[f"G{r}"] = f'=IF(F{r}="Atteint","",E{r}-TODAY())'
    wsJ[f"H{r}"] = f'=IFERROR(VLOOKUP($D{r},Versions!$B${V_FIRST}:$P${V_LAST},9,FALSE),0)'
    wsJ[f"I{r}"] = f'=IF(AND(F{r}<>"Atteint",F{r}<>"Abandonné",TODAY()>E{r}),"Dépassé",IF(AND(F{r}<>"Atteint",F{r}<>"Abandonné",E{r}-TODAY()<=7),"Cette semaine",""))'
    wsJ[f"J{r}"] = f'=IF(AND(F{r}<>"Atteint",F{r}<>"Abandonné",E{r}>=TODAY()),E{r},"")'
    body(wsJ, r, 2, 11)
    for c in "EF":
        wsJ[f"{c}{r}"].fill = FILL_INPUT
    for c in "GHIJ":
        wsJ[f"{c}{r}"].fill = FILL_CALC; wsJ[f"{c}{r}"].alignment = A_CENTER
    wsJ[f"E{r}"].number_format = "DD/MM/YYYY"; wsJ[f"J{r}"].number_format = "DD/MM/YYYY"; wsJ[f"H{r}"].number_format = "0%"
    wsJ[f"E{r}"].alignment = A_CENTER; wsJ[f"D{r}"].alignment = A_CENTER; wsJ[f"B{r}"].alignment = A_CENTER
J_LAST = J_FIRST + len(JALONS) - 1
dvj = DataValidation(type="list", formula1=f"={JAL_RNG}", allow_blank=True); wsJ.add_data_validation(dvj); dvj.add(f"F{J_FIRST}:F{J_LAST}")
dvv = DataValidation(type="list", formula1=f"={VER_RNG}", allow_blank=True); wsJ.add_data_validation(dvv); dvv.add(f"D{J_FIRST}:D{J_LAST}")
wsJ.conditional_formatting.add(f"I{J_FIRST}:I{J_LAST}", FormulaRule(formula=[f'I{J_FIRST}="Dépassé"'], fill=PatternFill("solid", fgColor=DANGER_BG), font=Font(color=DANGER, bold=True)))
wsJ.conditional_formatting.add(f"I{J_FIRST}:I{J_LAST}", FormulaRule(formula=[f'I{J_FIRST}="Cette semaine"'], fill=PatternFill("solid", fgColor=WARN_BG), font=Font(color=WARN, bold=True)))
wsJ.conditional_formatting.add(f"F{J_FIRST}:F{J_LAST}", FormulaRule(formula=[f'F{J_FIRST}="Atteint"'], fill=PatternFill("solid", fgColor=OK_BG), font=Font(color=OK, bold=True)))
wsJ.conditional_formatting.add(f"F{J_FIRST}:F{J_LAST}", FormulaRule(formula=[f'F{J_FIRST}="En risque"'], fill=PatternFill("solid", fgColor=WARN_BG), font=Font(color=WARN, bold=True)))
wsJ.column_dimensions["J"].hidden = True
widths(wsJ, [3, 7, 52, 9, 12, 12, 12, 14, 14, 12, 36])
wsJ.freeze_panes = "D6"

# ================================================================== RISQUES
wsR = wb.create_sheet("Risques")
title(wsR, "Registre des risques", "Score = probabilité x impact (1 à 5). Niveau et alerte calculés. Statut et mitigation à tenir à jour.")
RISQUES = [
    ("R01", "Équipe de développement non confirmée ou sous-dimensionnée", "Organisation", 4, 5, "V1", "Chef de projet", "Décision de M. Bruno avant J01 ; sinon retrait de la démo RPS puis du matching automatisé", "Ouvert"),
    ("R02", "Aucune API CFE / RCCM disponible", "Dépendance externe", 3, 4, "V1", "Chef de projet", "Adaptateur à double mode : API ou saisie manuelle supervisée", "Ouvert"),
    ("R03", "Designer UI/UX non disponible de bout en bout", "Organisation", 3, 3, "V1", "M. Bruno", "Confirmer la proposition Bouley avant J04", "Ouvert"),
    ("R04", "Périmètre V1 qui s'élargit pendant le mois", "Périmètre", 4, 4, "V1", "Chef de projet", "Gel du périmètre à J03, toute demande passe par l'onglet Decisions", "Ouvert"),
    ("R05", "Démonstration perçue comme un produit fini (sur-promesse)", "Communication", 3, 4, "V1", "M. Bruno", "Note de cadrage V1, étiquette 'démonstration synthétique' sur chaque écran", "Ouvert"),
    ("R06", "Prestataire de signature qualifiée non contractualisé à temps", "Dépendance externe", 3, 4, "V2", "M. Bruno", "Lancer la consultation des PSC accrédités dès la fin de V1", "Ouvert"),
    ("R07", "Retard des portes de conformité (IPDCP, DPO, pentest)", "Réglementaire", 3, 5, "V3", "Conseil juridique / DPO", "Démarrer les démarches IPDCP pendant V2", "Ouvert"),
    ("R08", "Partenaire fiscal non identifié", "Dépendance externe", 3, 2, "V3", "M. Bruno", "Confirmer TaxeFacile ou qualifier une alternative avant V3", "Ouvert"),
    ("R09", "Périmètre de l'intégration Remo.co plus large que prévu", "Technique", 2, 3, "V4", "Chef de projet", "Cadrage écrit avant chiffrage définitif (J14)", "Ouvert"),
    ("R10", "Fournisseur IA sans clauses de confidentialité acceptables", "Dépendance externe", 3, 5, "V5", "Conseil juridique", "Consultation dès V3, clauses de non-réutilisation des données", "Ouvert"),
    ("R11", "Fuite de divulgation T0 / T1 sur un dossier titres en production", "Sécurité", 2, 5, "V2", "Équipe de développement", "Allow-list serveur, tests DISCLOSURE_LEAK sur les 12 cas de référence", "Surveillé"),
    ("R12", "Sur-ingénierie par rapport au plafond du pilote (2 000 comptes)", "Technique", 2, 2, "V2", "Chef de projet", "Revue d'architecture à chaque version contre le plafond de capacité", "Surveillé"),
    ("R14", "Calendrier V2 à V5 compressé (V5 : 153 j/p en trois semaines) avec lancement commercial au 01/03/2027", "Planning", 4, 4, "V5", "Chef de projet", "Dimensionner l'équipe sur l'ETP requis affiché dans la feuille de route, ou déplacer les surfaces DealLens non essentielles après le lancement ; commander le pentest et le contrat IA dès V2", "Ouvert"),
    ("R13", "Pentest indépendant reporté en V3 : la démonstration V1 tourne sans audit externe", "Sécurité", 3, 4, "V1", "Chef de projet", "Revue de sécurité interne et scan de dépendances en V1 (lot Sécurité) ; aucun environnement accessible publiquement avant V3 ; commander le pentest dès V2", "Ouvert"),
]
hR = ["ID", "Risque", "Catégorie", "Probabilité (1-5)", "Impact (1-5)", "Score", "Niveau", "Version", "Responsable", "Mitigation", "Statut"]
for i, h in enumerate(hR):
    wsR.cell(row=5, column=2 + i, value=h)
head(wsR, 5, 2, 12, height=30)
R_FIRST = 6
for i, rk in enumerate(RISQUES):
    r = R_FIRST + i
    rid, nom, cat, p, im, ver, resp, mit, st = rk
    wsR[f"B{r}"], wsR[f"C{r}"], wsR[f"D{r}"], wsR[f"E{r}"], wsR[f"F{r}"] = rid, nom, cat, p, im
    wsR[f"G{r}"] = f"=E{r}*F{r}"
    wsR[f"H{r}"] = f'=IF(G{r}>=15,"Critique",IF(G{r}>=8,"Élevé",IF(G{r}>=4,"Moyen","Faible")))'
    wsR[f"I{r}"], wsR[f"J{r}"], wsR[f"K{r}"], wsR[f"L{r}"] = ver, resp, mit, st
    body(wsR, r, 2, 12)
    for c in "EFL":
        wsR[f"{c}{r}"].fill = FILL_INPUT
    for c in "GH":
        wsR[f"{c}{r}"].fill = FILL_CALC
    for c in "BEFGHIL":
        wsR[f"{c}{r}"].alignment = A_CENTER
R_LAST = R_FIRST + len(RISQUES) - 1
dvp = DataValidation(type="whole", operator="between", formula1="1", formula2="5"); wsR.add_data_validation(dvp); dvp.add(f"E{R_FIRST}:F{R_LAST + 50}")
dvs = DataValidation(type="list", formula1=f"={RSK_RNG}", allow_blank=True); wsR.add_data_validation(dvs); dvs.add(f"L{R_FIRST}:L{R_LAST + 50}")
wsR.conditional_formatting.add(f"H{R_FIRST}:H{R_LAST + 50}", FormulaRule(formula=[f'H{R_FIRST}="Critique"'], fill=PatternFill("solid", fgColor=DANGER_BG), font=Font(color=DANGER, bold=True)))
wsR.conditional_formatting.add(f"H{R_FIRST}:H{R_LAST + 50}", FormulaRule(formula=[f'H{R_FIRST}="Élevé"'], fill=PatternFill("solid", fgColor=WARN_BG), font=Font(color=WARN, bold=True)))
wsR.conditional_formatting.add(f"H{R_FIRST}:H{R_LAST + 50}", FormulaRule(formula=[f'H{R_FIRST}="Moyen"'], fill=PatternFill("solid", fgColor=INFO_BG)))
wsR.conditional_formatting.add(f"L{R_FIRST}:L{R_LAST + 50}", FormulaRule(formula=[f'L{R_FIRST}="Clos"'], fill=PatternFill("solid", fgColor=OK_BG), font=Font(color=OK, bold=True)))
widths(wsR, [3, 7, 46, 18, 12, 11, 8, 10, 9, 22, 50, 11])
wsR.freeze_panes = "D6"

# ================================================================== DECISIONS
wsD = wb.create_sheet("Decisions")
title(wsD, "Journal des décisions et arbitrages", "Toute demande de changement de périmètre passe par ce journal. Statut à mettre à jour au fil des réponses.")
DECISIONS = [
    ("D01", "09/09/2026", "Périmètre cible", "Le cahier des charges v0 approuvé et le Référentiel P04-P25 sont retenus comme cible finale ; le blueprint v5 n'est pas retenu.", "Tranché", "M. Bruno", "Cadre toute la feuille de route", "", ""),
    ("D02", "09/09/2026", "Deal-Connect / Guichet Diaspora", "Remo.co retenu comme connecteur externe pour les salons et rendez-vous virtuels.", "Tranché", "M. Bruno", "Intégration dès V1 ; périmètre d'intégration à cadrer", "Cadrage écrit sur la documentation API Remo", "18/09/2026"),
    ("D04", "10/09/2026", "Lot Sécurité en V1", "Huit constats de sécurité traités avant la présentation (RLS effective, anti-force-brute, MFA, chiffrement applicatif, en-têtes, idempotence et signatures, revue interne, mots de passe de démonstration). Le pentest indépendant reste en V3 (porte G10).", "Tranché", "Chef de projet", "+19 j/p sur V1 ; voir l'onglet Securite", "Commencer par la RLS effective", "18/09/2026"),
    ("D03", "09/09/2026", "Démonstration RPS en V1", "V1 inclut une démonstration maquettée du blocage de publication d'une cession de titres ; le circuit réel reste en V2.", "Tranché", "Chef de projet", "+20 j/p sur V1", "", ""),
    ("A01", "09/09/2026", "Équipe de développement", "Taille et séniorité de l'équipe disponible dès maintenant ?", "Ouvert", "M. Bruno", "Détermine si V1 tient en 5 semaines ou nécessite des coupes", "Réponse attendue avant J01", "14/09/2026"),
    ("A02", "09/09/2026", "API CFE / RCCM", "Une API existe-t-elle, ou faut-il un échange de fichier supervisé ?", "Ouvert", "CCI-Togo", "Bloque le lot Espace CCI-Togo", "Vérifier avant le démarrage du lot", "16/09/2026"),
    ("A03", "09/09/2026", "Designer UI/UX", "Confirmation d'un designer de bout en bout (proposition Bouley) ?", "Ouvert", "M. Bruno", "Sans lui, la charge frontend absorbe la conception", "Décision avant J04", "18/09/2026"),
    ("A04", "09/09/2026", "Statut Deal-Experts (P13)", "Processus contractuel déjà opposable, ou cible future ?", "Ouvert", "CCI-Togo", "Change le dimensionnement du module EXP et sa version", "Clarifier avec la CCI-Togo avant V4", "31/01/2027"),
    ("A05", "09/09/2026", "Numérotation P01-P03", "Processus manquants ou numérotation volontaire à partir de P04 ?", "Ouvert", "CCI-Togo", "Faible impact sur le plan", "Confirmer avec le juridique", ""),
    ("A06", "09/09/2026", "Partenaire fiscal", "'TaxeFacile' est-il le partenaire réel, ou faut-il en qualifier un ?", "Ouvert", "M. Bruno", "Impacte le lot Conformité fiscale de V3", "Qualifier avant V3", "30/11/2026"),
    ("A07", "09/09/2026", "Charte du COPIL", "Composition, cadence exacte, règles de vote ?", "Ouvert", "CCI-Togo", "Gouvernance inter-version", "Récupérer l'annexe de la Convention", ""),
    ("A15", "11/09/2026", "Registre d'interactions", "Le standard impose que chaque contrôle visible porte un identifiant présent au registre, et le Release Gate en fait une condition bloquante. Le registre officiel ne couvre que trois surfaces de référence (fiche d'opportunité, data room, gabarit de service) et compte 76 identifiants ; le code en utilise 382, dont 6 conformes. Option retenue à confirmer : reprendre les identifiants officiels sur les surfaces couvertes, et tenir dans le dépôt un registre étendu, au même format, pour les surfaces absentes du corpus.", "Ouvert", "M. Bruno", "Condition bloquante de recette officielle ; conditionne le nommage de tout ce qui sera écrit en V2", "Trancher avant d'écrire les surfaces de la data room", "16/10/2026"),
    ("A13", "02/10/2026", "Retrait d'une publication", "La machine à états du v0 ne prévoit aucun retour depuis LISTED_OPEN : un dossier publié ne peut être fermé qu'en l'abandonnant, ce qui est définitif. L'écran le dit désormais au lieu de promettre un retrait. Une suspension réversible est inscrite en V2, sous réserve d'un amendement accepté par M. Bruno.", "Ouvert", "M. Bruno", "Un cédant qui suspend une vente ne doit pas avoir à abandonner son dossier", "Trancher avant le début de V2", "16/10/2026"),
    ("A12", "24/09/2026", "Certification visible dans le jeu de démonstration", "Aucune fixture de référence ne certifie un dossier publié : le badge Deal-Ready n'apparaîtrait jamais sur la place de marché pendant la démonstration. Le chargement de démonstration certifie donc PT-003, avec une portée explicite. Les fixtures restent intactes et demeurent l'oracle des tests.", "Tranché", "Chef de projet", "La démonstration montre les deux états, certifié et non certifié, sans altérer les cas de référence", "Confirmer le choix du dossier certifié avec M. Bruno avant la répétition générale", "12/10/2026"),
    ("A11", "23/09/2026", "Formats acceptés en pièce de dossier", "Documents, tableurs, présentations et images sont acceptés, anciens formats compris (PDF, Word, Excel, PowerPoint, OpenDocument, RTF, CSV, texte, JPEG, PNG, WebP, TIFF, HEIC) : ces formats sont ceux qui circulent réellement au Togo. Tous passent par l'antivirus, ne sont jamais exécutés, et seuls les PDF et images s'ouvrent dans le navigateur, le reste se télécharge. Les archives compressées restent exclues (ADR 0007).", "Tranché", "Chef de projet", "Ergonomie réelle contre surface de risque, arbitrée par l'analyse antivirus obligatoire", "Revoir si le pentest de V3 signale un vecteur bureautique", "18/12/2026"),
    ("A10", "15/09/2026", "Préalable à la certification", "L'octroi Deal-Ready exige une vérification RCCM ou CFE enregistrée pour l'entreprise ; le serveur refuse l'octroi sans elle (INVALID_TRANSITION). Le refus et le retrait restent possibles sans vérification.", "Tranché", "Chef de projet", "Évite un badge accordé sur des données uniquement déclaratives", "Confirmer la règle avec la CCI-Togo lors de la recette", "15/10/2026"),
    ("A09", "10/09/2026", "Palette de l'application", "La charte de marque (Marine Encre #1C2751, Bleu Signal #6678F1, Barlow) et le design system produit (Marine #0B2B52, Signal #1769E8, Inter) diffèrent. L'application suit le design system produit (PT-001 = autorité visuelle) ; la charte régit le site public. À confirmer par le designer.", "Ouvert", "Designer UI/UX", "Cohérence visuelle entre application et site public", "Trancher dès la nomination du designer", "18/09/2026"),
    ("A08", "09/09/2026", "Fournisseur IA (DealLens)", "Quel fournisseur, avec quelles clauses de confidentialité ?", "Ouvert", "Conseil juridique", "Bloque tout le lot V5", "Lancer la consultation dès V3", "09/04/2027"),
]
hD = ["ID", "Date", "Sujet", "Décision ou question", "Statut", "Décideur", "Impact", "Prochaine action", "Échéance"]
for i, h in enumerate(hD):
    wsD.cell(row=5, column=2 + i, value=h)
head(wsD, 5, 2, 10, height=30)
D_FIRST = 6
for i, d in enumerate(DECISIONS):
    r = D_FIRST + i
    for j, val in enumerate(d):
        wsD.cell(row=r, column=2 + j, value=val)
    body(wsD, r, 2, 10)
    wsD[f"F{r}"].fill = FILL_INPUT; wsD[f"F{r}"].alignment = A_CENTER
    wsD[f"B{r}"].alignment = A_CENTER; wsD[f"C{r}"].alignment = A_CENTER; wsD[f"J{r}"].alignment = A_CENTER
D_LAST = D_FIRST + len(DECISIONS) - 1
dvd = DataValidation(type="list", formula1=f"={DEC_RNG}", allow_blank=True); wsD.add_data_validation(dvd); dvd.add(f"F{D_FIRST}:F{D_LAST + 50}")
wsD.conditional_formatting.add(f"F{D_FIRST}:F{D_LAST + 50}", FormulaRule(formula=[f'F{D_FIRST}="Tranché"'], fill=PatternFill("solid", fgColor=OK_BG), font=Font(color=OK, bold=True)))
wsD.conditional_formatting.add(f"F{D_FIRST}:F{D_LAST + 50}", FormulaRule(formula=[f'F{D_FIRST}="Ouvert"'], fill=PatternFill("solid", fgColor=DANGER_BG), font=Font(color=DANGER, bold=True)))
wsD.conditional_formatting.add(f"F{D_FIRST}:F{D_LAST + 50}", FormulaRule(formula=[f'F{D_FIRST}="En discussion"'], fill=PatternFill("solid", fgColor=WARN_BG)))
widths(wsD, [3, 6, 11, 24, 52, 12, 16, 34, 30, 11])
wsD.freeze_panes = "D6"

# ================================================================== ACTEURS
wsA = wb.create_sheet("Acteurs")
title(wsA, "Acteurs et responsabilités (RACI)", "R = réalise, A = approuve (un seul par module), C = consulté, I = informé. Dérivé du Référentiel de processus.")
ACTORS = [
    ("Chef de projet / architecte", "DealPME", "Abdou-Raouf", "Pilotage, architecture, arbitrages techniques, tenue de ce classeur"),
    ("Équipe de développement", "DealPME", "À confirmer", "Réalisation, tests, documentation"),
    ("Propriétaire produit", "DealPME", "M. Bruno H.", "Priorisation, validation des livrables, décisions de périmètre"),
    ("Référent institutionnel", "CCI-Togo", "À désigner", "Confirmation d'adhésion, certification Deal-Ready, promotion, COPIL"),
    ("Designer UI/UX", "Externe", "À confirmer (proposition Bouley)", "Conception des écrans, revue visuelle"),
    ("Conseil juridique / DPO", "Externe", "À désigner", "Avis RPS, revue des modèles, IPDCP, nomination DPO"),
    ("Prestataires techniques", "Externe", "PSC signature, mobile money, PSAE, Remo.co, fournisseur IA", "Intégrations sous contrat"),
    ("Experts indépendants", "Externe", "Registre à constituer", "Diagnostics Deal-Ready, missions d'expertise"),
]
hA = ["Rôle", "Organisation", "Personne / entité", "Responsabilités"]
for i, h in enumerate(hA):
    wsA.cell(row=5, column=2 + i, value=h)
head(wsA, 5, 2, 5)
for i, a in enumerate(ACTORS):
    r = 6 + i
    for j, val in enumerate(a):
        wsA.cell(row=r, column=2 + j, value=val)
    body(wsA, r, 2, 5)
    wsA[f"D{r}"].fill = FILL_INPUT
A_END = 5 + len(ACTORS)

r = A_END + 3
wsA[f"B{r}"] = "Matrice RACI par module"; wsA[f"B{r}"].font = F_LABEL
r += 1
short = ["Chef de projet", "Équipe dev", "Propriétaire produit", "CCI-Togo", "Designer UI/UX", "Juridique / DPO", "Prestataires", "Experts"]
wsA.cell(row=r, column=2, value="Module")
for i, s in enumerate(short):
    wsA.cell(row=r, column=3 + i, value=s)
head(wsA, r, 2, 2 + len(short), height=30)
RACI = {
    "FOND": "A R C I - C - -", "TRV": "A R I - C - C -", "IDN": "A R C I C C C -", "GOV": "C R C A - C - -",
    "CCI": "C R C A - C - C", "MKT": "A R C I C C - -", "RPS": "C R C I - A - -", "SIG": "A R C I - C R -",
    "VDR": "A R C I C C - -", "NEG": "A R C I C C - -", "REA": "A R C C - C - -", "LEG": "C R C I - A R -",
    "FIN": "C R A C - C - -", "SUP": "A R C I - C - -", "OPS": "A R I C - C C -", "REB": "A R C C - C - C",
    "CNX": "C R C A C - R -", "DIA": "A R C C C C R -", "EXP": "A R C C - C - R", "VDR-IA": "A R C I C C R -",
}
r += 1
raci_first = r
for m in MODULES:
    wsA.cell(row=r, column=2, value=f"{m[0]}  {m[1]}")
    for i, letter in enumerate(RACI[m[0]].split()):
        cell = wsA.cell(row=r, column=3 + i, value=letter if letter != "-" else "")
        cell.alignment = A_CENTER
    body(wsA, r, 2, 2 + len(short))
    for c in range(3, 3 + len(short)):
        wsA.cell(row=r, column=c).alignment = A_CENTER
    r += 1
raci_last = r - 1
raci_rng = f"C{raci_first}:J{raci_last}"
wsA.conditional_formatting.add(raci_rng, FormulaRule(formula=[f'C{raci_first}="A"'], fill=PatternFill("solid", fgColor=INK), font=Font(color=WHITE, bold=True)))
wsA.conditional_formatting.add(raci_rng, FormulaRule(formula=[f'C{raci_first}="R"'], fill=PatternFill("solid", fgColor=OK_BG), font=Font(color=OK, bold=True)))
wsA.conditional_formatting.add(raci_rng, FormulaRule(formula=[f'C{raci_first}="C"'], fill=PatternFill("solid", fgColor=WARN_BG)))
wsA.conditional_formatting.add(raci_rng, FormulaRule(formula=[f'C{raci_first}="I"'], fill=PatternFill("solid", fgColor=PAPER)))
widths(wsA, [3, 44, 13, 16, 13, 14, 15, 13, 10])
wsA.column_dimensions["E"].width = 46

# ================================================================== GANTT
wsG = wb.create_sheet("Gantt")
title(wsG, "Planning hebdomadaire", "Barres calculées depuis les dates de l'onglet Taches. Bleu : prévu. Ambre : en cours. Vert : fait. Colonne surlignée : semaine courante.")
G_START = dt.date(2026, 8, 31)  # lundi
N_WEEKS = 41
gh = ["ID", "Tâche", "Version", "Module", "Début", "Fin", "Statut"]
for i, h in enumerate(gh):
    wsG.cell(row=5, column=2 + i, value=h)
head(wsG, 5, 2, 8, height=30)
WK_COL0 = 9  # colonne I
for w in range(N_WEEKS):
    c = WK_COL0 + w
    d = G_START + dt.timedelta(days=7 * w)
    cell = wsG.cell(row=5, column=c, value=d)
    cell.number_format = "DD/MM"
    cell.font, cell.fill, cell.border = F_HEAD, FILL_HEAD, BORDER
    cell.alignment = Alignment(textRotation=90, horizontal="center", vertical="center")
    wsG.column_dimensions[get_column_letter(c)].width = 3.2
wsG.row_dimensions[5].height = 46
wsG.cell(row=4, column=WK_COL0, value="Semaine du (lundi)").font = F_LABEL
G_FIRST = 6
G_ROWS = NTASK_ROWS
last_wk_col = get_column_letter(WK_COL0 + N_WEEKS - 1)
for idx in range(G_ROWS):
    r = G_FIRST + idx
    tr = T_FIRST + idx
    wsG[f"B{r}"] = f'=IF(Taches!B{tr}="","",Taches!B{tr})'
    wsG[f"C{r}"] = f'=IF(Taches!B{tr}="","",Taches!F{tr})'
    wsG[f"D{r}"] = f'=IF(Taches!B{tr}="","",Taches!C{tr})'
    wsG[f"E{r}"] = f'=IF(Taches!B{tr}="","",Taches!D{tr})'
    wsG[f"F{r}"] = f'=IF(Taches!P{tr}="","",Taches!P{tr})'
    wsG[f"G{r}"] = f'=IF(Taches!Q{tr}="","",Taches!Q{tr})'
    wsG[f"H{r}"] = f'=IF(Taches!B{tr}="","",Taches!J{tr})'
    for c in range(2, 9):
        cell = wsG.cell(row=r, column=c); cell.font = F_NORMAL; cell.border = BORDER; cell.fill = FILL_CALC
        cell.alignment = Alignment(vertical="center", wrap_text=(c == 3))
    wsG[f"F{r}"].number_format = "DD/MM/YYYY"; wsG[f"G{r}"].number_format = "DD/MM/YYYY"
    for w in range(N_WEEKS):
        c = WK_COL0 + w
        L = get_column_letter(c)
        wsG.cell(row=r, column=c, value=f'=IF(OR($F{r}="",$G{r}=""),"",IF(AND({L}$5<=$G{r},{L}$5+6>=$F{r}),IF($H{r}="Complétée","F",IF(OR($H{r}="En cours",$H{r}="En revue"),"E",IF($H{r}="Bloquée","B","P"))),""))')
        cell = wsG.cell(row=r, column=c)
        cell.font = Font(name="Calibri", size=1, color=WHITE)
        cell.border = Border(left=Side(style="hair", color="E3E5EC"), right=Side(style="hair", color="E3E5EC"), top=Side(style="hair", color="E3E5EC"), bottom=Side(style="hair", color="E3E5EC"))
G_LAST = G_FIRST + G_ROWS - 1
grid = f"I{G_FIRST}:{last_wk_col}{G_LAST}"
wsG.conditional_formatting.add(grid, FormulaRule(formula=[f'I{G_FIRST}="F"'], fill=PatternFill("solid", fgColor=OK)))
wsG.conditional_formatting.add(grid, FormulaRule(formula=[f'I{G_FIRST}="E"'], fill=PatternFill("solid", fgColor=WARN)))
wsG.conditional_formatting.add(grid, FormulaRule(formula=[f'I{G_FIRST}="B"'], fill=PatternFill("solid", fgColor=DANGER)))
wsG.conditional_formatting.add(grid, FormulaRule(formula=[f'I{G_FIRST}="P"'], fill=PatternFill("solid", fgColor=ACCENT)))
wsG.conditional_formatting.add(grid, FormulaRule(formula=[f'AND(I$5<=TODAY(),I$5+6>=TODAY())'], fill=PatternFill("solid", fgColor="FFF3C4")))
wsG.conditional_formatting.add(f"I5:{last_wk_col}5", FormulaRule(formula=['AND(I$5<=TODAY(),I$5+6>=TODAY())'], fill=PatternFill("solid", fgColor=WARN)))
widths(wsG, [3, 9, 44, 8, 8, 11, 11, 10])
wsG.freeze_panes = "I6"

# ================================================================== TABLEAU DE BORD
wsB = wb.create_sheet("Tableau_de_bord", 0)
wsB.sheet_view.showGridLines = False
wsB["B2"] = "DealPME : tableau de bord du projet"; wsB["B2"].font = F_TITLE
wsB["B3"] = "Toutes les valeurs de cette page sont calculées. Pour mettre à jour le projet, modifier uniquement l'onglet Taches (statuts, % saisi, dates) et les onglets Jalons, Risques, Decisions."
wsB["B3"].font = F_SUB; wsB.merge_cells("B3:N3"); wsB["B3"].alignment = A_WRAP; wsB.row_dimensions[3].height = 28
wsB["B4"] = "Date du jour"; wsB["C4"] = "=TODAY()"; wsB["C4"].number_format = "DD/MM/YYYY"
wsB["E4"] = "Jours avant la démonstration V1"; wsB["G4"] = f"=Versions!E{V_FIRST}-TODAY()"
wsB["I4"] = "Périmètre cible"; wsB["J4"] = "Cahier des charges v0 + Référentiel P04-P25"
for c in ("B4", "E4", "I4"):
    wsB[c].font = F_LABEL
for c in ("C4", "G4", "J4"):
    wsB[c].font = F_BOLD

# KPI tiles
kpis = [
    ("Avancement global", f"=Modules!I{M_TOTAL}", "0%"),
    ("Charge totale (j/p)", f"=Modules!G{M_TOTAL}", "0"),
    ("Charge réalisée (j/p)", f"=Modules!H{M_TOTAL}", "0.0"),
    ("Charge totale (sem.-pers.)", f"=Modules!G{M_TOTAL}/5", "0.0"),
    ("Tâches", f"=Modules!J{M_TOTAL}", "0"),
    ("Faites", f"=Modules!K{M_TOTAL}", "0"),
    ("En cours", f"=Modules!L{M_TOTAL}", "0"),
    ("Bloquées", f"=Modules!M{M_TOTAL}", "0"),
    ("En retard", f"=Modules!N{M_TOTAL}", "0"),
    ("Risques critiques ou élevés ouverts", f'=COUNTIFS(Risques!$H${R_FIRST}:$H${R_LAST + 50},"Critique",Risques!$L${R_FIRST}:$L${R_LAST + 50},"<>Clos")+COUNTIFS(Risques!$H${R_FIRST}:$H${R_LAST + 50},"Élevé",Risques!$L${R_FIRST}:$L${R_LAST + 50},"<>Clos")', "0"),
    ("Décisions ouvertes", f'=COUNTIF(Decisions!$F${D_FIRST}:$F${D_LAST + 50},"Ouvert")+COUNTIF(Decisions!$F${D_FIRST}:$F${D_LAST + 50},"En discussion")', "0"),
    ("Jalons dépassés", f'=COUNTIF(Jalons!$I${J_FIRST}:$I${J_LAST},"Dépassé")', "0"),
    ("Tâches sans responsable", f"={E_UNASSIGNED}", "0"),
    ("Charge non assignée (j/p)", f"={E_UNASSIGNED_CH}", "0.0"),
    ("Personnes actives dans l'équipe", f'=COUNTIF(Equipe!$H${E_FIRST}:$H${E_LAST},"Oui")', "0"),
    ("Charge restante (j/p)", f"=Modules!G{M_TOTAL}-Modules!H{M_TOTAL}", "0.0"),
    ("Semaines-personne restantes", f"=(Modules!G{M_TOTAL}-Modules!H{M_TOTAL})/5", "0.0"),
    ("Risques ouverts (tous niveaux)", f'=COUNTIF(Risques!$L${R_FIRST}:$L${R_LAST + 50},"Ouvert")', "0"),
]
r0 = 6
for i, (lab, f, fmt) in enumerate(kpis):
    row = r0 + (i // 6) * 3
    col = 2 + (i % 6) * 2
    lc = wsB.cell(row=row, column=col, value=lab); lc.font = F_LABEL; lc.alignment = A_WRAP
    vc = wsB.cell(row=row + 1, column=col, value=f); vc.font = F_KPI; vc.number_format = fmt; vc.alignment = Alignment(horizontal="left", vertical="center")
    wsB.merge_cells(start_row=row, start_column=col, end_row=row, end_column=col + 1)
    wsB.merge_cells(start_row=row + 1, start_column=col, end_row=row + 1, end_column=col + 1)
    for rr in (row, row + 1):
        for cc in (col, col + 1):
            wsB.cell(row=rr, column=cc).fill = PatternFill("solid", fgColor=PAPER)
            wsB.cell(row=rr, column=cc).border = BORDER
    wsB.row_dimensions[row + 1].height = 30
def kpi_cell(i):
    return f"{get_column_letter(2 + (i % 6) * 2)}{r0 + (i // 6) * 3 + 1}"
for i in (7, 8, 9, 10, 11, 12):
    c = kpi_cell(i)
    wsB.conditional_formatting.add(c, FormulaRule(formula=[f'{c}>0'], font=Font(color=DANGER, bold=True, size=20)))

# versions table
r = r0 + ((len(kpis) - 1) // 6 + 1) * 3 + 1
wsB.cell(row=r, column=2, value="Avancement par version").font = F_LABEL
r += 1
hv = ["Version", "Objet", "Fin prévue", "Jours restants", "Charge (sem.)", "Avancement", "Tâches", "Faites", "Bloquées", "En retard", "État"]
for i, h in enumerate(hv):
    wsB.cell(row=r, column=2 + i, value=h)
head(wsB, r, 2, 12, height=28)
r += 1
vb_first = r
for i in range(len(VERSIONS)):
    vr = V_FIRST + i
    refs = [f"=Versions!B{vr}", f"=Versions!C{vr}", f"=Versions!E{vr}", f"=Versions!F{vr}", f"=Versions!H{vr}", f"=Versions!J{vr}",
            f"=Versions!K{vr}", f"=Versions!L{vr}", f"=Versions!N{vr}", f"=Versions!O{vr}", f"=Versions!P{vr}"]
    for j, f in enumerate(refs):
        wsB.cell(row=r, column=2 + j, value=f)
    body(wsB, r, 2, 12, fill=FILL_CALC.fgColor.rgb[-6:])
    wsB.cell(row=r, column=4).number_format = "DD/MM/YYYY"
    wsB.cell(row=r, column=6).number_format = "0.0"
    wsB.cell(row=r, column=7).number_format = "0%"
    for c in (2, 4, 5, 6, 7, 8, 9, 10, 11, 12):
        wsB.cell(row=r, column=c).alignment = A_CENTER
    wsB.row_dimensions[r].height = 30
    r += 1
vb_last = r - 1
wsB.conditional_formatting.add(f"G{vb_first}:G{vb_last}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color=ACCENT))
wsB.conditional_formatting.add(f"L{vb_first}:L{vb_last}", FormulaRule(formula=[f'L{vb_first}="En dépassement"'], fill=PatternFill("solid", fgColor=DANGER_BG), font=Font(color=DANGER, bold=True)))
wsB.conditional_formatting.add(f"L{vb_first}:L{vb_last}", FormulaRule(formula=[f'L{vb_first}="Livrée"'], fill=PatternFill("solid", fgColor=OK_BG), font=Font(color=OK, bold=True)))
wsB.conditional_formatting.add(f"L{vb_first}:L{vb_last}", FormulaRule(formula=[f'L{vb_first}="En cours"'], fill=PatternFill("solid", fgColor=WARN_BG)))

# modules table
r = vb_last + 3
wsB.cell(row=r, column=2, value="Avancement par module").font = F_LABEL
r += 1
hm = ["Code", "Module", "Version cible", "Charge (j/p)", "Avancement", "Tâches", "Faites", "En cours", "Bloquées", "En retard", "État"]
for i, h in enumerate(hm):
    wsB.cell(row=r, column=2 + i, value=h)
head(wsB, r, 2, 12, height=28)
r += 1
mb_first = r
for i in range(len(MODULES)):
    mr = M_FIRST + i
    refs = [f"=Modules!B{mr}", f"=Modules!C{mr}", f"=Modules!F{mr}", f"=Modules!G{mr}", f"=Modules!I{mr}", f"=Modules!J{mr}",
            f"=Modules!K{mr}", f"=Modules!L{mr}", f"=Modules!M{mr}", f"=Modules!N{mr}", f"=Modules!O{mr}"]
    for j, f in enumerate(refs):
        wsB.cell(row=r, column=2 + j, value=f)
    body(wsB, r, 2, 12, fill=FILL_CALC.fgColor.rgb[-6:])
    wsB.cell(row=r, column=6).number_format = "0%"
    for c in (2, 4, 5, 6, 7, 8, 9, 10, 11, 12):
        wsB.cell(row=r, column=c).alignment = A_CENTER
    r += 1
mb_last = r - 1
wsB.conditional_formatting.add(f"F{mb_first}:F{mb_last}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color=ACCENT))
wsB.conditional_formatting.add(f"L{mb_first}:L{mb_last}", FormulaRule(formula=[f'L{mb_first}="Terminé"'], fill=PatternFill("solid", fgColor=OK_BG), font=Font(color=OK, bold=True)))
wsB.conditional_formatting.add(f"L{mb_first}:L{mb_last}", FormulaRule(formula=[f'L{mb_first}="Bloqué (partiel)"'], fill=PatternFill("solid", fgColor=DANGER_BG), font=Font(color=DANGER, bold=True)))
wsB.conditional_formatting.add(f"L{mb_first}:L{mb_last}", FormulaRule(formula=[f'L{mb_first}="En cours"'], fill=PatternFill("solid", fgColor=WARN_BG)))
wsB.conditional_formatting.add(f"J{mb_first}:K{mb_last}", FormulaRule(formula=[f'J{mb_first}>0'], font=Font(color=DANGER, bold=True)))

# prochains jalons
r = mb_last + 3
wsB.cell(row=r, column=2, value="Prochain jalon").font = F_LABEL
wsB.cell(row=r, column=4, value=f'=IFERROR(INDEX(Jalons!$C${J_FIRST}:$C${J_LAST},MATCH(MIN(Jalons!$J${J_FIRST}:$J${J_LAST}),Jalons!$J${J_FIRST}:$J${J_LAST},0)),"Aucun")').font = F_BOLD
wsB.cell(row=r, column=10, value=f'=IFERROR(MIN(Jalons!$J${J_FIRST}:$J${J_LAST}),"")').number_format = "DD/MM/YYYY"
wsB.cell(row=r, column=10).font = F_BOLD
wsB.merge_cells(start_row=r, start_column=4, end_row=r, end_column=9)
r += 1
wsB.cell(row=r, column=2, value="Jalons des 30 prochains jours").font = F_LABEL
wsB.cell(row=r, column=4, value=f'=COUNTIFS(Jalons!$E${J_FIRST}:$E${J_LAST},">="&TODAY(),Jalons!$E${J_FIRST}:$E${J_LAST},"<="&(TODAY()+30),Jalons!$F${J_FIRST}:$F${J_LAST},"<>Atteint")').font = F_BOLD

# charge par personne
r += 3
wsB.cell(row=r, column=2, value="Charge par personne (équipe inscrite)").font = F_LABEL
r += 1
he = ["Nom", "Rôle", "Actif", "Tâches", "Charge (j/p)", "Réalisé (j/p)", "Avancement", "En cours", "Bloquées", "En retard", "Restant (j/p)"]
for i, h in enumerate(he):
    wsB.cell(row=r, column=2 + i, value=h)
head(wsB, r, 2, 12, height=28)
r += 1
eb_first = r
for i in range(12):
    er = E_FIRST + i
    refs = [f'=IF(Equipe!B{er}="","",Equipe!B{er})', f'=IF(Equipe!B{er}="","",Equipe!C{er})', f'=IF(Equipe!B{er}="","",Equipe!H{er})',
            f'=IF(Equipe!B{er}="","",Equipe!I{er})', f'=IF(Equipe!B{er}="","",Equipe!J{er})', f'=IF(Equipe!B{er}="","",Equipe!K{er})',
            f'=IF(Equipe!B{er}="","",Equipe!L{er})', f'=IF(Equipe!B{er}="","",Equipe!M{er})', f'=IF(Equipe!B{er}="","",Equipe!N{er})',
            f'=IF(Equipe!B{er}="","",Equipe!O{er})', f'=IF(Equipe!B{er}="","",Equipe!Q{er})']
    for j, f in enumerate(refs):
        wsB.cell(row=r, column=2 + j, value=f)
    body(wsB, r, 2, 12, fill=FILL_CALC.fgColor.rgb[-6:])
    wsB.cell(row=r, column=8).number_format = "0%"
    for c in (6, 7, 12):
        wsB.cell(row=r, column=c).number_format = "0.0"
    for c in range(4, 13):
        wsB.cell(row=r, column=c).alignment = A_CENTER
    r += 1
eb_last = r - 1
wsB.conditional_formatting.add(f"H{eb_first}:H{eb_last}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color=ACCENT))
wsB.conditional_formatting.add(f"J{eb_first}:K{eb_last}", FormulaRule(formula=[f'AND(J{eb_first}<>"",J{eb_first}>0)'], font=Font(color=DANGER, bold=True)))
widths(wsB, [3, 11, 44, 13, 12, 12, 12, 10, 10, 10, 10, 15, 4, 4])
wsB.freeze_panes = "B5"

# ================================================================== PRESENTATION
wsX = wb.create_sheet("Presentation")
title(wsX, "DealPME : présentation du projet", "Place de marché de transmission et reprise de PME en Afrique francophone (zone OHADA), pilote Togo, en partenariat avec la CCI-Togo.")
LASTCOL = 9

def para(ws, r, text, font=None, height=None, fill=None):
    c = ws.cell(row=r, column=2, value=text)
    c.font = font or F_NORMAL
    c.alignment = A_WRAP
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=LASTCOL)
    if height:
        ws.row_dimensions[r].height = height
    if fill:
        for cc in range(2, LASTCOL + 1):
            ws.cell(row=r, column=cc).fill = PatternFill("solid", fgColor=fill)
    return r + 1

def section(ws, r, text):
    c = ws.cell(row=r, column=2, value=text)
    c.font = Font(name="Calibri", size=12, bold=True, color=WHITE)
    for cc in range(2, LASTCOL + 1):
        ws.cell(row=r, column=cc).fill = FILL_HEAD
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=LASTCOL)
    ws.row_dimensions[r].height = 22
    return r + 1

def small_table(ws, r, headers_, rows_, col_widths=None):
    for i, h in enumerate(headers_):
        ws.cell(row=r, column=2 + i, value=h)
    head(ws, r, 2, 2 + len(headers_) - 1, height=24)
    r += 1
    for row_ in rows_:
        for i, v in enumerate(row_):
            ws.cell(row=r, column=2 + i, value=v)
        body(ws, r, 2, 2 + len(headers_) - 1)
        ws.row_dimensions[r].height = 30
        r += 1
    return r + 1

r = 5
r = section(wsX, r, "1. Le projet en quelques lignes")
r = para(wsX, r, "DealPME est une infrastructure de confiance pour la transmission et la reprise de PME : elle vérifie les acteurs, prépare les dossiers, met en relation sous confidentialité contrôlée, sécurise la divulgation d'information et orchestre la transaction avec des professionnels. DealPME est un fournisseur logiciel : elle ne valorise pas, ne certifie pas, ne détient pas de fonds et n'est jamais partie à la transaction. La certification Deal-Ready est une décision souveraine et nominative de la CCI-Togo.", height=70)
r = para(wsX, r, "Signature de marque : « Là où les entreprises changent de mains. »", font=F_SUB)
r += 1
r = section(wsX, r, "2. Documents de référence et autorité")
r = small_table(wsX, r, ["Document", "Rôle", "Statut retenu"], [
    ("Cahier des charges v0 approuvé (54 p., 25/06/2026)", "Spécification technique et juridique, ancrée AUSCGIE / AUDCG / AUPCAP, vendeurs locaux réels", "Autorité principale"),
    ("Référentiel de processus P04 à P25 (50 p., v1.0, contractuel CCI-Togo)", "22 processus opposables, RACI, contrôles, indicateurs ; dérive directement du v0", "Autorité opérationnelle"),
    ("Note investisseurs et partenaires (28 p., 26/06/2026)", "Thèse, marché, monétisation, feuille de route", "Contexte stratégique"),
    ("Services Blueprint v5.0", "Vision générique (escrow, valorisation automatique, KYC biométrique, hub courtiers) non retrouvée dans le v0 ni le référentiel", "Non retenu"),
    ("Master Developer Handoff V3.1 (12 cas, 24 scénarios, 6 Skills)", "Corpus de référence exécutable : maquettes et fixtures servant d'oracle de test, pas de code de production", "Socle de conception à porter en production"),
])
r = section(wsX, r, "3. Socle réglementaire qui gouverne tout le reste")
r = para(wsX, r, "Bifurcation des types de cession : chaque dossier est typé dès l'origine ASSET_DEAL (fonds de commerce, librement commercialisable) ou SHARE_DEAL (titres, cercle fermé obligatoire). La forme juridique de la cible est vérifiée au RCCM.", height=44)
r = para(wsX, r, "Regulatory Perimeter Service (RPS) : service indépendant qui applique trois paliers de divulgation. T0 : existence (secteur, région, taille). T1 : teaser anonymisé, jamais de prix ni d'identité. T2 : identité, prix et data room, uniquement après NDA. Compteur de divulgation par personne, plafond de cercle (défaut 50), filtre de communication, journal append-only haché. L'admission n'est jamais automatique.", height=70)
r = para(wsX, r, "Dix portes de conformité (G1 à G10) doivent être fermées avant tout lancement commercial : déclaration IPDCP, transfert transfrontalier, prestataire de signature qualifié, revues juridiques, avis écrit sur le RPS, audit du texte d'interface, recalcul de la rétrocession, DPO nommé, pentest indépendant.", height=56)
r = section(wsX, r, "4. Pipeline transactionnel")
r = para(wsX, r, "Compte vérifié  >  Qualifié  >  Admis (RPS)  >  NDA signé  >  T2 autorisé  >  Data room et Q&R  >  LOI et audit d'acquisition  >  Réalisation documentée. Chaque état est un sur-ensemble strict du précédent ; aucune étape ne peut être sautée sans règle documentée.", font=F_BOLD, height=44)
r = section(wsX, r, "5. Intégrations réelles retenues par le v0")
r = small_table(wsX, r, ["Besoin", "Vendeurs retenus", "Note"], [
    ("Mobile money", "CinetPay, PayDunya, Hub2, PayGate Global, Gozem Pay", "Rails réels : T-Money, Flooz, Gozem Money ; pas de carte bancaire par défaut"),
    ("Signature électronique", "Prestataire togolais accrédité ARCEP (PSC)", "Présomption légale de fiabilité, critère décisif"),
    ("Vérification d'identité", "Capture documentaire, revue humaine, OTP", "Aucune biométrie en v0"),
    ("Registre des entreprises", "CFE / RCCM", "Si aucune API : échange de fichier supervisé"),
    ("Archivage de preuve", "PSAE accrédité", "Valeur probante du NDA"),
    ("Événements et rendez-vous virtuels", "Remo.co", "Connecteur externe pour Deal-Connect et Guichet Diaspora"),
    ("Fiscalité", "Partenaire tiers à confirmer", "Le nom TaxeFacile n'apparaît que dans le blueprint v5"),
])
r = section(wsX, r, "6. Exigences transverses")
r = small_table(wsX, r, ["Domaine", "Exigence"], [
    ("Disponibilité", "99,5 % mensuel, obligation de résultat contractuelle ; RPO 1 h, RTO 4 h ; priorités P1 à P4 avec délais"),
    ("Capacité pilote", "2 000 comptes, 300 sessions concurrentes, 200 deals actifs, 20 000 documents ; test de charge à 2x ; ne pas sur-construire"),
    ("Sécurité", "TLS 1.3, AES-256, chiffrement applicatif des champs CONFIDENTIAL_DEAL, séparation VDR / marketplace, idempotence des webhooks, pentest"),
    ("Localisation", "Français langue source, formats FCFA sans décimale, termes OHADA jamais traduits, dates DD/MM/YYYY"),
    ("Ingénierie", "Monorepo apps/ et packages/, RPS déployé séparément, REST /v1, UUIDv7, montants en entier XOF, pagination par curseur"),
])
r = section(wsX, r, "7. Hors périmètre v0 (à ne pas construire maintenant)")
r = small_table(wsX, r, ["Élément", "Statut", "Raison"], [(n, s, c) for n, s, c in HORS_PERIMETRE])
r = section(wsX, r, "8. Décisions actées")
for d in ("Le cahier des charges v0 et le Référentiel P04 à P25 sont la cible finale ; le blueprint v5 n'est pas retenu.",
          "Remo.co est retenu comme connecteur externe pour les salons et rendez-vous virtuels ; intégration dès V1, billetterie et sponsoring en V4.",
          "V1 inclut une démonstration maquettée du blocage RPS (+20 j/p) ; le circuit réel reste en V2."):
    r = para(wsX, r, "- " + d, height=18)
widths(wsX, [3, 30, 44, 34, 12, 12, 12, 12, 12])

# ================================================================== FEUILLE DE ROUTE
wsF = wb.create_sheet("Feuille_de_route")
title(wsF, "Feuille de route V1 à V5", "Détail de chaque version. Les charges et avancements par lot sont calculés depuis l'onglet Taches.")
ROADMAP = {
    "V1": {
        "focus": "Premier produit de démonstration, à données synthétiques, pour faire comprendre le fonctionnement de DealPME. Cessions d'actifs uniquement, plus une démonstration maquettée du blocage RPS. La CCI-Togo confirme l'adhésion et décide seule de la certification.",
        "inclus": ["Authentification et rôles : cédant, investisseur, agent CCI-Togo, administrateur",
                   "Espace CCI-Togo : confirmation d'adhésion, vérification RCCM/CFE, décision de certification nominative",
                   "Pass Transmission : constitution du dossier cédant",
                   "Marketplace de cessions d'actifs : recherche et mise en relation simple",
                   "Évaluation financière sommaire et indicative",
                   "Badge Deal-Ready affiché, workflow porté par la CCI-Togo",
                   "Démonstration maquettée du blocage RPS (bannière de nullité, scénario scripté)",
                   "Deal-Connect via Remo.co : événements, inscriptions avec consentement, lien d'accès unique, présence par webhook",
                   "Guichet Diaspora léger : demande de rendez-vous avec avis transfrontalier, entretien vidéo Remo après confirmation humaine",
                   "Lot Sécurité : RLS effective, anti-force-brute, MFA officiers et administrateurs, chiffrement applicatif, en-têtes, idempotence et signatures de webhooks, revue interne"],
        "exclu": ["Circuit RPS réel : admission humaine, compteur, plafond, journal réglementaire (V2)",
                  "Data room chiffrée, filigranée, révocable et Q&R (V2)",
                  "Moteur d'honoraires et rétrocession CCI (V3)",
                  "Alerte & Rebond, billetterie et sponsoring Deal-Connect, rendez-vous mutuels, rapport post-événement, profil diaspora complet (V4)"],
        "prerequis": "Équipe de développement confirmée (5 à 6 profils) ; réponse sur l'API CFE/RCCM ; designer UI/UX confirmé.",
        "decision": "La démonstration RPS fait partie de V1. Sans équipe à 5 ou 6 profils, la démonstration RPS est le premier lot à retirer, avant le matching automatisé.",
        "lots": ["Conception", "Fondations", "Auth et rôles", "Espace CCI-Togo", "Deal-Ready", "Dossier cédant", "Marketplace actifs", "Évaluation indicative", "Démonstration RPS", "Deal-Connect (Remo)", "Sécurité", "Frontend et design", "Finition frontend", "QA et livraison"],
    },
    "V2": {
        "focus": "Le cœur du différenciateur produit : le moteur RPS complet pour les cessions de titres et la data room. Prérequis à toute diligence réelle.",
        "inclus": ["Circuit RPS complet : admission humaine, plafond de cercle (défaut 50), journal réglementaire haché",
                   "Signature électronique et preuve : prestataire PSC togolais, repli papier, archivage PSAE",
                   "Data room : arborescence OHADA, rendu serveur, filigrane dynamique, téléchargement contrôlé, révocation en moins de 60 s",
                   "Fils de questions-réponses par document"],
        "exclu": ["Négociation, LOI, audit d'acquisition et réalisation (V3)", "Génération documentaire LegalTech (V3)"],
        "prerequis": "Modèle de données Deal et Organisation de V1 ; contrat avec le prestataire de signature qualifiée.",
        "decision": "",
        "lots": ["Conception", "Circuit RPS réel", "Signature électronique", "Data room", "Questions-réponses", "QA et sécurité"],
    },
    "V3": {
        "focus": "Ce qui rend une transaction réelle facturable et légalement défendable : négociation et réalisation, LegalTech OHADA, moteur de frais et rétrocession, support, fermeture des dix portes de conformité et durcissement de l'exploitation.",
        "inclus": ["Offre, contre-offre, LOI et registre des points ouverts d'audit d'acquisition",
                   "Réalisation documentée sans Deal-Pay natif, création automatique du FeeEvent",
                   "LegalTech OHADA : NDA, LOI, pacte simplifié, SPA, cession d'actifs, contrat de travail (droit togolais)",
                   "Finance : barème de frais sous drapeau juridique, rétrocession CCI, journal de calcul recalculable, rapport trimestriel",
                   "Support et accès privilégiés, mode break-glass journalisé",
                   "Portes de conformité G1 à G10 : IPDCP, revues juridiques, DPO, pentest indépendant",
                   "Exploitation : supervision SLA 99,5 %, sauvegardes testées, procédure d'incident"],
        "exclu": ["Deal-Experts (V4, sous réserve d'arbitrage)", "Modules réseau : Alerte & Rebond, Deal-Connect, Guichet Diaspora (V4)"],
        "prerequis": "Des transactions peuvent atteindre CLOSED_REPORTED (V2) ; avis juridique écrit sur le barème de frais.",
        "decision": "Le barème de frais et la rétrocession ne s'activent qu'après avis juridique écrit, jamais par simple décision produit.",
        "lots": ["Conception", "LegalTech OHADA", "Conformité fiscale", "Négociation", "Audit d'acquisition", "Réalisation", "Finance", "Support", "Portes de conformité", "Exploitation"],
    },
    "V4": {
        "focus": "Les modules réseau. Seul changement d'architecture notable : la brique de salons et rendez-vous virtuels est externalisée vers Remo.co plutôt que construite en propre.",
        "inclus": ["Alerte & Rebond : auto-diagnostic, cellule de crise confidentielle, listings d'actifs en difficulté, coupe-circuit",
                   "Deal-Connect : événements B2B via connecteur Remo.co ; DealPME gère inscriptions, billetterie, attribution et reporting",
                   "Guichet Diaspora : liste de suivi, rendez-vous sécurisé via Remo.co, contraintes transfrontalières, renvoi vers banque et conseil",
                   "Deal-Experts : registre d'experts, routage, accès temporaire scopé (sous réserve de l'arbitrage P13)"],
        "exclu": ["Mécanismes d'enchère en temps réel (non présumés contractuels)", "Tout conseil de change ou d'investissement fourni par la plateforme"],
        "prerequis": "Portes de conformité fermées (V3) ; cadrage écrit de l'intégration Remo.co.",
        "decision": "Remo.co est retenu. Le périmètre exact (SSO natif, webhooks de présence, marque blanche) dépend du plan Remo.co choisi.",
        "lots": ["Conception", "Alerte & Rebond", "Actifs en difficulté", "Deal-Connect", "Guichet Diaspora", "Deal-Experts"],
    },
    "V5": {
        "focus": "Le module le plus spécifié du corpus existant et pourtant le plus éloigné de la production : aucun fournisseur IA n'est engagé. Placé en dernier car le moins urgent contractuellement et le plus risqué techniquement.",
        "inclus": ["Contrat fournisseur IA et pare-feu de permission : filtrage avant récupération, jamais après",
                   "Neuf surfaces : Cockpit, DealLens document et salle, Issue Radar, Evidence Map, Atelier Q&R, Engagement Pulse, Audit, Accès et Clean Team",
                   "Rapprochement financier, intelligence de version, caviardage assisté avec revue humaine",
                   "Tests AI-01 à AI-06, DOC-01 à DOC-03, Q&A-01, UI-01"],
        "exclu": ["Toute action autonome de l'IA : publication, changement de permission, certification, réponse au cédant"],
        "prerequis": "Data room de production stable (V2) ; contrat fournisseur IA avec clauses de confidentialité.",
        "decision": "DealLens reste assistif et lecture seule : il explique, résume, extrait et propose, il ne décide jamais.",
        "lots": ["Conception", "Fournisseur IA", "Ingestion", "DealLens", "Surfaces", "Accès", "QA IA"],
    },
}
r = 5
for vi, v in enumerate(VERSIONS):
    code = v[0]
    vr = V_FIRST + vi
    d = ROADMAP[code]
    # bandeau
    c = wsF.cell(row=r, column=2, value=f"{code}  {v[1]}")
    c.font = Font(name="Calibri", size=13, bold=True, color=WHITE)
    for cc in range(2, LASTCOL + 1):
        wsF.cell(row=r, column=cc).fill = FILL_HEAD
    wsF.merge_cells(start_row=r, start_column=2, end_row=r, end_column=LASTCOL)
    wsF.row_dimensions[r].height = 26
    r += 1
    # indicateurs
    labels = [("Début prévu", f"=Versions!D{vr}", "DD/MM/YYYY"), ("Fin prévue", f"=Versions!E{vr}", "DD/MM/YYYY"),
              ("Charge (j/p)", f"=Versions!G{vr}", "0"), ("Charge (sem.-pers.)", f"=Versions!H{vr}", "0.0"),
              ("Avancement", f"=Versions!J{vr}", "0%"), ("État", f"=Versions!P{vr}", "@"),
              ("Semaines calendaires", f"=ROUND((Versions!E{vr}-Versions!D{vr})/7,1)", "0.0"),
              ("ETP requis à pleine cadence", f"=IFERROR(ROUND(Versions!H{vr}/((Versions!E{vr}-Versions!D{vr})/7),1),0)", "0.0")]
    for i, (lab, f, fmt) in enumerate(labels):
        cc = 2 + i
        lc = wsF.cell(row=r, column=cc, value=lab); lc.font = F_LABEL; lc.alignment = A_WRAPC; lc.border = BORDER
        vc = wsF.cell(row=r + 1, column=cc, value=f); vc.font = F_BOLD; vc.number_format = fmt; vc.alignment = A_CENTER; vc.border = BORDER; vc.fill = FILL_CALC
    wsF.row_dimensions[r].height = 28
    r += 2
    r = para(wsF, r, d["focus"], height=48)
    # inclus / exclu
    wsF.cell(row=r, column=2, value="Inclus").font = F_LABEL
    wsF.cell(row=r, column=6, value="Exclu ou reporté").font = F_LABEL
    r += 1
    n = max(len(d["inclus"]), len(d["exclu"]))
    for i in range(n):
        if i < len(d["inclus"]):
            c = wsF.cell(row=r, column=2, value="+ " + d["inclus"][i]); c.font = F_NORMAL; c.alignment = A_WRAP
            wsF.merge_cells(start_row=r, start_column=2, end_row=r, end_column=5)
        if i < len(d["exclu"]):
            c = wsF.cell(row=r, column=6, value="- " + d["exclu"][i]); c.font = Font(name="Calibri", size=10, color=DANGER); c.alignment = A_WRAP
            wsF.merge_cells(start_row=r, start_column=6, end_row=r, end_column=LASTCOL)
        wsF.row_dimensions[r].height = 30
        r += 1
    # lots
    r += 1
    hl = ["Lot", "Charge (j/p)", "Réalisé (j/p)", "Avancement", "Tâches", "Complétées", "Bloquées", "En retard"]
    for i, h in enumerate(hl):
        wsF.cell(row=r, column=2 + i, value=h)
    head(wsF, r, 2, 2 + len(hl) - 1, height=24)
    r += 1
    lf = r
    for lot in d["lots"]:
        wsF.cell(row=r, column=2, value=lot)
        wsF.cell(row=r, column=3, value=f'=SUMIFS({rng("charge_ret")},{rng("version")},"{code}",{rng("lot")},$B{r})')
        wsF.cell(row=r, column=4, value=f'=SUMIFS({rng("charge_real")},{rng("version")},"{code}",{rng("lot")},$B{r})')
        wsF.cell(row=r, column=5, value=f'=IF(C{r}=0,0,D{r}/C{r})')
        wsF.cell(row=r, column=6, value=f'=COUNTIFS({rng("version")},"{code}",{rng("lot")},$B{r},{rng("statut")},"<>Abandonnée",{rng("id")},"<>")')
        wsF.cell(row=r, column=7, value=f'=COUNTIFS({rng("version")},"{code}",{rng("lot")},$B{r},{rng("statut")},"Complétée")')
        wsF.cell(row=r, column=8, value=f'=COUNTIFS({rng("version")},"{code}",{rng("lot")},$B{r},{rng("statut")},"Bloquée")')
        wsF.cell(row=r, column=9, value=f'=COUNTIFS({rng("version")},"{code}",{rng("lot")},$B{r},{rng("retard")},"En retard")')
        body(wsF, r, 2, 9, fill=FILL_CALC.fgColor.rgb[-6:])
        wsF.cell(row=r, column=5).number_format = "0%"
        wsF.cell(row=r, column=4).number_format = "0.0"
        for cc in range(3, 10):
            wsF.cell(row=r, column=cc).alignment = A_CENTER
        r += 1
    ll = r - 1
    wsF.cell(row=r, column=2, value="Total " + code)
    wsF.cell(row=r, column=3, value=f"=SUM(C{lf}:C{ll})")
    wsF.cell(row=r, column=4, value=f"=SUM(D{lf}:D{ll})")
    wsF.cell(row=r, column=5, value=f"=IF(C{r}=0,0,D{r}/C{r})")
    for cc in range(6, 10):
        L = get_column_letter(cc)
        wsF.cell(row=r, column=cc, value=f"=SUM({L}{lf}:{L}{ll})")
    for cc in range(2, 10):
        cell = wsF.cell(row=r, column=cc); cell.border = BORDER; cell.fill = PatternFill("solid", fgColor=PAPER); cell.font = F_BOLD; cell.alignment = A_CENTER
    wsF.cell(row=r, column=5).number_format = "0%"; wsF.cell(row=r, column=4).number_format = "0.0"
    wsF.conditional_formatting.add(f"E{lf}:E{ll}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color=ACCENT))
    wsF.conditional_formatting.add(f"H{lf}:I{ll}", FormulaRule(formula=[f'H{lf}>0'], font=Font(color=DANGER, bold=True)))
    r += 2
    wsF.cell(row=r, column=2, value="Prérequis").font = F_LABEL; r += 1
    r = para(wsF, r, d["prerequis"], height=30)
    if d["decision"]:
        wsF.cell(row=r, column=2, value="Décision ou règle").font = F_LABEL; r += 1
        r = para(wsF, r, d["decision"], height=36, fill=WARN_BG)
    r += 2
widths(wsF, [3, 30, 16, 16, 14, 14, 14, 14, 30])
wsF.freeze_panes = "B5"

# ================================================================== SECURITE
wsS = wb.create_sheet("Securite")
title(wsS, "Registre de sécurité", "Chaque constat, son traitement, sa version cible et la tâche qui le porte. Le statut de la tâche est lu automatiquement dans l'onglet Taches.")
SECU = [
    ("S01", "L'API se connecte avec le rôle propriétaire de la base : les politiques RLS existent mais ne s'exercent pas", "Un défaut d'autorisation applicatif expose les dossiers d'un autre cédant", "Rôle dealpme_api sans contournement, contexte par transaction, test négatif", "V1", "RLS effective : rôle applicatif sans contournement, contexte app.organisation_id et app.roles par transaction"),
    ("S02", "Aucune limitation de débit ni verrouillage après échecs de connexion", "Force brute sur /auth/login et sur les codes OTP", "Limitation par IP et par compte, verrouillage progressif, journal des échecs", "V1", "Anti-force-brute : limitation de débit par IP et par compte, verrouillage progressif, journal des échecs"),
    ("S03", "Pas de vérification email ni de second facteur effectif", "Usurpation d'un compte officier ou administrateur", "Vérification email, MFA obligatoire pour les officiers CCI-Togo et les administrateurs", "V1", "Vérification email, MFA obligatoire pour les officiers CCI-Togo et les administrateurs, liaison OTP"),
    ("S04", "Champs CONFIDENTIAL_DEAL (prix, valorisation) en clair en base", "Un dump de la base révèle les conditions des cessions", "Chiffrement applicatif, clé hors base, rotation documentée", "V1", "Chiffrement applicatif des champs CONFIDENTIAL_DEAL, clé gérée hors base, rotation documentée"),
    ("S05", "Pas d'en-têtes de sécurité HTTP, pas de CORS explicite", "Injection de contenu, appels depuis des origines inconnues", "CSP, HSTS, CORS strict, cookies sécurisés, taille maximale des requêtes", "V1", "En-têtes de sécurité HTTP, CORS strict, cookies sécurisés, taille maximale des corps de requête"),
    ("S06", "Idempotence en mémoire ; signatures de webhooks non vérifiées (faux connecteurs)", "Double effet sur rejeu ; webhook forgé accepté", "Idempotence en base, HMAC vérifié sur chaque webhook, test de rejeu", "V1", "Idempotence persistée en base et vérification de signature HMAC sur tous les webhooks"),
    ("S07", "Mot de passe commun du jeu de démonstration", "Accès trivial si le jeu est chargé sur un environnement accessible", "Mots de passe uniques, chargement refusé hors développement", "V1", "Mots de passe de démonstration uniques par compte, jeu de démonstration interdit hors environnement local"),
    ("S08", "Aucun scan de dépendances exécuté", "Vulnérabilité connue embarquée sans alerte", "Scan bloquant en CI sur vulnérabilité critique, revue interne selon la liste de contrôle v0", "V1", "Revue de sécurité interne (liste de contrôle v0 : paliers, URL pré-signées, compteur RPS) et scan de dépendances bloquant en CI"),
    ("S15", "Les tables entreprise et vérification de registre n'étaient pas couvertes par la RLS : tout compte authentifié pouvait lire la raison sociale et l'état d'instruction d'une entreprise tierce (constat interne du 24/09/2026)", "Fuite d'information entre cédants concurrents", "Corrigé le jour même : RLS activée sur company et registry_record (propriétaire et institution), lectures de la console passées sous contexte officier, contrôle de fumée ajouté", "V1", "Tests négatifs : permissions serveur, accès non autorisés, contrôles morts"),
    ("S16", "Une écriture refusée par la RLS ne lève pas d'erreur : elle ne touche aucune ligne. L'API annonçait une transition d'état qui n'avait pas eu lieu (constat interne du 02/10/2026)", "Décision affichée comme prise alors que rien n'a changé en base", "Corrigé le jour même : toute transition vérifie le nombre de lignes touchées et échoue en FORBIDDEN sinon ; politique RLS étroite ajoutée pour le renvoi en préparation par un officier ; contrôles de fumée ajoutés", "V1", "Tests négatifs : permissions serveur, accès non autorisés, contrôles morts"),
    ("S17", "Une règle de conception écrite dans les conventions mais sans artefact ni test : le registre des contrôles d'interface était exigé par nos propres documents et n'existait nulle part (constat du 11/09/2026)", "Dérive silencieuse : 376 identifiants inventés, condition bloquante de recette non tenue", "Registre importé dans le dépôt (qa/registre-interactions.json) et test qui refuse tout identifiant inconnu ; preuve de couverture produite automatiquement", "V1", "Tests négatifs : permissions serveur, accès non autorisés, contrôles morts"),
    ("S09", "Aucun pentest indépendant", "Failles non détectées par l'équipe elle-même", "Reporté en V3 (porte G10) : exige un prestataire externe et un périmètre stabilisé ; mitigation V1 = revue interne S08, aucun environnement public avant V3 ; commander le pentest dès V2", "V3", "Pentest indépendant et remédiation des constats critiques et élevés (G10)"),
    ("S10", "Documents servis sans rendu serveur ni filigrane (data room absente en V1)", "Fuite de documents confidentiels", "Reporté en V2 avec la data room : rendu serveur, filigrane, URL pré-signées courtes, révocation en moins de 60 s ; V1 ne stocke aucun document de data room", "V2", "Visualiseur rendu serveur, page à page, chargement progressif (3G)"),
    ("S11", "Preuve de signature non qualifiée (pas de NDA en V1)", "NDA non opposable", "Reporté en V2 : prestataire PSC accrédité ARCEP, archivage PSAE ; V1 n'exécute aucun NDA", "V2", "Intégration API de signature qualifiée, webhooks à signature vérifiée"),
    ("S12", "Accès administrateur non tracé par mode break-glass", "Accès silencieux à des dossiers confidentiels", "Reporté en V3 avec le module support ; V1 : journal d'audit persisté sur toute action sensible, aucun endpoint d'accès aux données confidentielles pour l'administrateur", "V3", "Mode 'break-glass' journalisé pour l'administration"),
    ("S13", "Vérification d'identité documentaire sans biométrie", "Usurpation d'identité au-delà de ce que le document capture", "Voulu par le v0 : biométrie interdite sans autorisation IPDCP (drapeau FEATURE_BIOMETRIC_KYC fermé) ; revue humaine et recoupement RCCM en V1", "P2", ""),
    ("S14", "Portes de conformité G1 à G10 non fermées (IPDCP, DPO, avis juridiques)", "Lancement commercial juridiquement exposé", "Reporté en V3 : condition explicite de lancement ; V1 est une démonstration à données synthétiques, jamais un service public", "V3", "Déclaration IPDCP et autorisation de transfert transfrontalier (G1, G2)"),
]
hS = ["ID", "Constat", "Risque si non traité", "Traitement et justification du calendrier", "Version cible", "Tâche liée (onglet Taches)", "Statut de la tâche", "Avancement", "Commentaire"]
for i, h in enumerate(hS):
    wsS.cell(row=5, column=2 + i, value=h)
head(wsS, 5, 2, 10, height=30)
S_FIRST = 6
for i, row_ in enumerate(SECU):
    r = S_FIRST + i
    sid, constat, risque, traitement, ver, tache = row_
    wsS[f"B{r}"], wsS[f"C{r}"], wsS[f"D{r}"], wsS[f"E{r}"], wsS[f"F{r}"], wsS[f"G{r}"] = sid, constat, risque, traitement, ver, tache
    wsS[f"H{r}"] = f'=IF($G{r}="","Sans tâche",IFERROR(INDEX({rng("statut")},MATCH($G{r},{rng("tache")},0)),"À planifier"))'
    wsS[f"I{r}"] = f'=IF($G{r}="","",IFERROR(INDEX({rng("avancement")},MATCH($G{r},{rng("tache")},0)),0))'
    body(wsS, r, 2, 10)
    wsS[f"H{r}"].fill = FILL_CALC; wsS[f"I{r}"].fill = FILL_CALC; wsS[f"J{r}"].fill = FILL_INPUT
    wsS[f"I{r}"].number_format = "0%"
    for c in "BFHI":
        wsS[f"{c}{r}"].alignment = A_CENTER
    wsS.row_dimensions[r].height = 58
S_LAST = S_FIRST + len(SECU) - 1
wsS.conditional_formatting.add(f"H{S_FIRST}:H{S_LAST}", FormulaRule(formula=[f'H{S_FIRST}="Complétée"'], fill=PatternFill("solid", fgColor=OK_BG), font=Font(color=OK, bold=True)))
wsS.conditional_formatting.add(f"H{S_FIRST}:H{S_LAST}", FormulaRule(formula=[f'H{S_FIRST}="En cours"'], fill=PatternFill("solid", fgColor=WARN_BG), font=Font(color=WARN, bold=True)))
wsS.conditional_formatting.add(f"H{S_FIRST}:H{S_LAST}", FormulaRule(formula=[f'H{S_FIRST}="Bloquée"'], fill=PatternFill("solid", fgColor=DANGER_BG), font=Font(color=DANGER, bold=True)))
wsS.conditional_formatting.add(f"I{S_FIRST}:I{S_LAST}", DataBarRule(start_type="num", start_value=0, end_type="num", end_value=1, color=ACCENT))
wsS.conditional_formatting.add(f"F{S_FIRST}:F{S_LAST}", FormulaRule(formula=[f'F{S_FIRST}<>"V1"'], fill=PatternFill("solid", fgColor=WARN_BG)))
r = S_LAST + 2
wsS.cell(row=r, column=2, value="Règle").font = F_LABEL
c = wsS.cell(row=r, column=3, value="Aucune tâche ne passe en Complétée sans son test négatif. Tout report de sécurité doit figurer ici avec sa justification, sa mitigation intermédiaire et sa version cible ; un report sans mitigation est refusé.")
c.font = F_NORMAL; c.alignment = A_WRAP
wsS.merge_cells(start_row=r, start_column=3, end_row=r, end_column=10); wsS.row_dimensions[r].height = 32
widths(wsS, [3, 6, 40, 34, 52, 10, 44, 14, 11, 24])
wsS.freeze_panes = "C6"

# ================================================================== GUIDE
wsGd = wb.create_sheet("Guide")
title(wsGd, "Mode d'emploi du classeur")
GUIDE = [
    ("Principe", "L'onglet Taches est la seule source de vérité. Tout le reste (Modules, Versions, Processus, Jalons, Tableau de bord, Gantt) se recalcule automatiquement à partir des tâches."),
    ("Mettre à jour une tâche", "Changer le Statut (liste déroulante). 'Complétée' = 100 %. Choisir le Responsable dans la liste des personnes inscrites dans l'onglet Equipe. Pour une tâche 'En cours', saisir un pourcentage dans '% saisi' si l'on veut être précis ; sinon 25 % s'applique par défaut (90 % pour 'En revue')."),
    ("Ajouter une tâche", "Écrire sur la première ligne vide de l'onglet Taches en renseignant au minimum ID, Version, Module, Tâche, Charge et Statut. Les formules des colonnes grises sont déjà en place jusqu'à la ligne 325. Le Gantt et tous les totaux la prennent en compte immédiatement."),
    ("Abandonner une tâche", "Mettre le statut 'Abandonnée' : la tâche sort des totaux de charge sans être supprimée (traçabilité)."),
    ("Codes couleur", "Cellules jaune pâle : à saisir. Cellules grises : calculées, ne pas modifier. Statuts colorés automatiquement (vert complétée, ambre en cours, rouge bloquée)."),
    ("Modules", "Avancement pondéré par la charge des tâches du module. Colonnes Responsable et Commentaire à saisir. Les éléments hors périmètre v0 sont listés pour mémoire, sans tâche."),
    ("Versions", "Les dates de début et de fin se saisissent ici. L'état passe automatiquement à 'En dépassement' si la date de fin est passée sans 100 %."),
    ("Jalons", "Saisir la date cible et le statut. La colonne Alerte signale 'Dépassé' ou 'Cette semaine'. Le tableau de bord affiche le prochain jalon non atteint."),
    ("Risques", "Saisir probabilité et impact de 1 à 5. Le score et le niveau se calculent. Passer le statut à 'Clos' quand le risque est levé."),
    ("Securite", "Registre des constats de sécurité : chaque ligne renvoie à la tâche qui la traite ; le statut et l'avancement se lisent automatiquement. Un report vers une version ultérieure doit être justifié et accompagné d'une mitigation."),
    ("Decisions", "Toute demande de changement de périmètre s'inscrit ici avant d'être traduite en tâches. Statut : Ouvert, En discussion, Tranché."),
    ("Gantt", "Barres hebdomadaires calculées depuis 'Début prévu' et 'Fin prévue' de chaque tâche. Modifier les dates dans Taches, pas dans le Gantt. La colonne de la semaine courante est surlignée."),
    ("Unités", "Charges en jours-personne (j/p). 5 j/p = 1 semaine-personne. Le calendrier réel dépend du nombre de personnes réellement affectées."),
    ("Paramètres", "Les listes déroulantes et l'avancement par défaut de chaque statut se modifient dans l'onglet Parametres."),
    ("Partage", "Ce classeur est conçu pour être le point de rencontre de tous les acteurs : les développeurs mettent à jour Taches, la CCI-Togo et M. Bruno lisent le Tableau de bord, les Jalons et les Decisions."),
]
for i, (k, v) in enumerate(GUIDE):
    r = 5 + i
    wsGd.cell(row=r, column=2, value=k).font = F_BOLD
    c = wsGd.cell(row=r, column=3, value=v); c.font = F_NORMAL; c.alignment = A_WRAP
    wsGd.row_dimensions[r].height = 44
    for cc in (2, 3):
        wsGd.cell(row=r, column=cc).border = BORDER
        wsGd.cell(row=r, column=cc).alignment = A_WRAP
widths(wsGd, [3, 22, 110])

# ordre des onglets
order = ["Tableau_de_bord", "Presentation", "Feuille_de_route", "Guide", "Taches", "Equipe", "Modules", "Versions", "Gantt", "Jalons", "Risques", "Securite", "Decisions", "Processus", "Acteurs", "Parametres"]
wb._sheets = [wb[n] for n in order]
wb.active = 0

# couleurs d'onglet
tabcol = {"Tableau_de_bord": INK, "Presentation": INK, "Feuille_de_route": INK, "Guide": STEEL, "Taches": ACCENT, "Equipe": ACCENT,
          "Modules": OK, "Versions": OK, "Gantt": ACCENT,
          "Jalons": WARN, "Risques": DANGER, "Securite": DANGER, "Decisions": WARN, "Processus": STEEL, "Acteurs": STEEL, "Parametres": "AAAAAA"}
for n, c in tabcol.items():
    wb[n].sheet_properties.tabColor = c

wb.save(OUT)
print("OK", OUT, "tâches:", len(T), "charges:", totals, "total j/p:", sum(totals.values()))
