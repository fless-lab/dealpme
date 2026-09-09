# -*- coding: utf-8 -*-
"""Génère les modules API non encore implémentés (V2 à V4), les fiches docs/modules et les .gitkeep."""
import os

ROOT = os.path.join(os.path.dirname(__file__), "..")
API = os.path.join(ROOT, "codebases", "backend", "api", "src", "modules")
DOCS = os.path.join(ROOT, "docs", "modules")

MODULES = {
    "signature": ("SignatureModule", "SIG", "V2", "P11",
        "Signature électronique et preuve : NDA versionné, prestataire PSC accrédité ARCEP, repli papier, SignatureEvidence (hash, chaîne de certificats, horodatage), archivage PSAE.",
        ["nda (génération, versions)", "esign (intégration PSC, webhooks vérifiés)", "fallback (parcours papier, contre-signature, vérification CCIT)", "evidence (preuve et archivage)"]),
    "dataroom": ("DataroomModule", "VDR", "V2", "P12",
        "Data room et questions-réponses : base séparée, rendu serveur page à page, filigrane dynamique, téléchargement désactivé par défaut, accès scopés à expiration obligatoire, révocation en moins de 60 s, journal des consultations.",
        ["folders (arborescence OHADA)", "documents (upload, antivirus, OCR, versions)", "viewer (rendu serveur, filigrane)", "access (grants, Clean Team, révocation)", "qa (fils par document)", "audit (DocumentView)"]),
    "negotiation": ("NegotiationModule", "NEG / REA", "V3", "P14, P15, P16",
        "Négociation et réalisation : offres et contre-offres versionnées, LOI générée par LegalTech, registre des points ouverts d'audit d'acquisition, décision poursuivre / renégocier / abandonner, réalisation déclarée par les parties sans Deal-Pay natif, création automatique du FeeEvent.",
        ["offers (offre, contre-offre)", "loi (lettre d'intention)", "diligence (points ouverts P15)", "closing (réalisation P16, FeeEvent)"]),
    "legaltech": ("LegaltechModule", "LEG", "V3", "P19",
        "LegalTech OHADA et conformité fiscale : modèles versionnés avec référence du conseil, génération PDF avec mention 'aide à la rédaction', contrat de travail sous Code du travail togolais, alertes sur clauses d'agrément et de préemption, module fiscal partenaire derrière drapeau.",
        ["templates (modèles versionnés)", "generation (PDF, variables, mentions)", "tax (module partenaire, jamais de fausse attestation)"]),
    "finance": ("FinanceModule", "FIN", "V3", "P24",
        "Finance : enregistrement des revenus par catégorie, revenu net avec décomposition, barème de frais sous drapeau juridique, rétrocession CCI par catégorie avec test d'éligibilité, journal de calcul recalculable, reporting trimestriel archivé, fenêtre de contestation de 30 jours, export d'audit scopé.",
        ["revenue (catégories, attribution)", "fees (barème, minimum, drapeau)", "retrocession (calcul, journal)", "reporting (continu, trimestriel, contestation)"]),
    "support": ("SupportModule", "SUP", "V3", "P23",
        "Support et accès privilégiés : tickets P1 à P4 avec délais contractuels, accès administrateur motivé, scopé, expirant, notification du propriétaire du dossier, mode break-glass journalisé.",
        ["tickets (sévérités, SLA)", "privileged-access (break-glass, notification)"]),
    "rebound": ("ReboundModule", "REB", "V4", "P17, P18",
        "Alerte & Rebond : auto-diagnostic, dossier de crise confidentiel INVITE_ONLY, registre d'investisseurs de retournement, signalement statutaire, listings d'actifs en difficulté par catégorie, coupe-circuit opérateur, ingestion des annonces de dissolution.",
        ["diagnostic (score de santé)", "crisis (dossier confidentiel)", "distressed-assets (listings, coupe-circuit)", "signals (flux CFE)"]),
    "experts": ("ExpertsModule", "EXP", "V4 (à confirmer)", "P13",
        "Deal-Experts : registre d'experts qualifiés, déclaration de conflit d'intérêts, routage du besoin, propositions et sélection par le client, contrat direct client-expert hors facturation DealPME, accès temporaire scopé en lecture expirant à la remise du livrable. Statut contractuel à trancher (arbitrage A04).",
        ["registry (experts, conflits)", "engagements (routage, sélection)", "scoped-access (lecture, expiration)"]),
}

MODULE_TMPL = '''import {{ Module }} from "@nestjs/common";

/**
 * Module {code} ({version}) : {desc}
 * Processus contractuel : {procs}.
 * Sous-modules prévus : {subs}.
 * Fiche complète : docs/modules/{name}.md. Vide jusqu'à sa version ; le contrat est figé ici pour que
 * l'architecture n'ait pas à être réorganisée plus tard.
 */
@Module({{}})
export class {cls} {{}}
'''

for name, (cls, code, version, procs, desc, subs) in MODULES.items():
    d = os.path.join(API, name)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, f"{name}.module.ts"), "w", encoding="utf-8") as f:
        f.write(MODULE_TMPL.format(cls=cls, code=code, version=version, procs=procs, desc=desc, subs="; ".join(subs), name=name))
    for s in subs:
        sub = s.split(" ")[0]
        sd = os.path.join(d, sub)
        os.makedirs(sd, exist_ok=True)
        open(os.path.join(sd, ".gitkeep"), "a").close()

# fiches modules (tous, y compris ceux de V1)
ALL = dict(MODULES)
ALL.update({
    "identity": ("IdentityModule", "IDN", "V1", "P08", "Identité, abonnement et facturation : inscription, Argon2id, OTP SMS, sessions serveur, consentements séparés, paliers d'abonnement prépayés.", ["auth", "otp", "session", "consent", "subscription"]),
    "institution": ("InstitutionModule", "GOV / CCI", "V1", "P06, P22", "Espace CCI-Togo : confirmation d'adhésion par référence, vérification RCCM/CFE, certification Deal-Ready nominative, tableau de bord agrégé.", ["membership", "registry", "certification", "dashboard"]),
    "marketplace": ("MarketplaceModule", "MKT", "V1", "P04, P05, P09", "Pass Transmission : dossier cédant, opportunités T0, recherche, mise en relation, alertes opt-in, évaluation indicative.", ["dossier", "listing", "search", "interest", "alerts", "valuation"]),
    "events": ("EventsModule", "CNX / DIA", "V4", "P20, P21", "Deal-Connect et Guichet Diaspora avec pont Remo.co (deux modes : DEALPME_FIRST par défaut, REMO_FIRST optionnel).", ["events", "booths", "ticketing", "meetings", "reporting", "diaspora"]),
})
os.makedirs(DOCS, exist_ok=True)
for name, (cls, code, version, procs, desc, subs) in sorted(ALL.items()):
    with open(os.path.join(DOCS, f"{name}.md"), "w", encoding="utf-8") as f:
        f.write(f"# Module {code} : {name}\n\n")
        f.write(f"- Classe : `{cls}` (`codebases/backend/api/src/modules/{name}/`)\n- Version cible : {version}\n- Processus contractuels : {procs}\n\n")
        f.write(f"## Périmètre\n\n{desc}\n\n## Sous-modules\n\n")
        for s in subs:
            f.write(f"- {s}\n")
        f.write("\n## Règles à ne jamais contourner\n\n- Autorisation côté serveur uniquement ; RLS en base pour les tables liées à un deal.\n- Aucun champ au-delà du palier de divulgation autorisé ne sort du serveur.\n- Chaque action sensible produit un événement d'audit (identifiants, action, résultat, corrélation).\n- Français langue source ; termes OHADA jamais traduits.\n\n## Suivi\n\nLes tâches de ce module sont dans `DealPME_Suivi.xlsx`, onglet Taches, colonne Module = "
                + code.split(" ")[0] + ".\n")

# .gitkeep dans tout dossier vide du dépôt (hors node_modules, ressources)
kept = 0
for base, dirs, files in os.walk(ROOT):
    rel = os.path.relpath(base, ROOT)
    if any(p in rel.split(os.sep) for p in ("node_modules", "ressources", ".git", "dist", ".next")):
        continue
    if not dirs and not files:
        open(os.path.join(base, ".gitkeep"), "a").close()
        kept += 1
print("modules générés :", ", ".join(MODULES), "| fiches :", len(ALL), "| .gitkeep ajoutés :", kept)
