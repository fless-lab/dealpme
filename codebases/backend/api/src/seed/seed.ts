import "reflect-metadata";
import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DealStatus, DealType, LegalForm, RegionCode, Role, TurnoverBand, newId } from "@dealpme/domain";
import { corpusAvailable, loadPassTransmissionFixture } from "@dealpme/testing";
import * as s from "../database/schema/core.js";
import { encryptField, encryptInt, keyRingFromEnv } from "../platform/field-crypto.js";

/**
 * Jeu de données de démonstration V1, dérivé du corpus de référence (PT-001 cas d'or, PT-003 / PT-006 / PT-012 cessions d'actifs).
 * Toutes les données sont synthétiques et étiquetées comme telles. Idempotent : ne recrée rien si l'administrateur existe déjà.
 * Mots de passe uniques par compte, dérivés d'un secret local aléatoire et écrits dans .demo-credentials.local.json
 * (ignoré par git). Aucun mot de passe commun, aucun mot de passe dans le code.
 */
const CREDENTIALS_FILE = process.env["DEMO_CREDENTIALS_FILE"]
  ? resolve(process.env["DEMO_CREDENTIALS_FILE"])
  : resolve(__dirname, "../../../../../.demo-credentials.local.json");
function demoPassword(secret: string, email: string): string {
  return "Demo-" + createHash("sha256").update(`${secret}:${email}`).digest("base64url").slice(0, 18);
}

interface Master {
  company: string;
  city: string;
  sector: string;
  deal_type: string;
  revenue_2025: number;
  asking: number;
  net_debt: number;
  badge: boolean;
}
interface Fixture {
  master: Master;
  financials: { kpis: { ebitda: number; net_debt: number } };
  deal_ready: { status: string; certification_awarded: boolean; scope_statement: string; decision_date: string; expiry_date: string };
  transaction_workspace: { legal_form: string; stake_offered_pct: number };
}

const SECTOR_CODES: Record<string, string> = { Agroalimentaire: "AGRO", Logistique: "LOGI", "Matériaux de construction": "BTP", Transport: "TRSP" };
function sectorCode(label: string): string {
  return SECTOR_CODES[label] ?? (label.replace(/[^A-Za-z]/g, "").slice(0, 6).toUpperCase() || "AUTRE");
}
function band(revenueMFcfa: number): TurnoverBand {
  if (revenueMFcfa < 50) return TurnoverBand.LT_50M;
  if (revenueMFcfa < 250) return TurnoverBand.FROM_50M_TO_250M;
  if (revenueMFcfa < 1000) return TurnoverBand.FROM_250M_TO_1B;
  return TurnoverBand.GT_1B;
}
function legalForm(v: string): LegalForm {
  return (Object.values(LegalForm) as string[]).includes(v) ? (v as LegalForm) : LegalForm.AUTRE;
}

async function main(): Promise<void> {
  if (process.env["NODE_ENV"] && process.env["NODE_ENV"] !== "development") {
    throw new Error("Le jeu de démonstration ne se charge qu'en développement local (NODE_ENV=development)");
  }
  // Le chargement traverse toutes les organisations : il utilise le rôle propriétaire, pas le rôle applicatif.
  const url = process.env["DATABASE_URL_CORE_ADMIN"];
  if (!url) throw new Error("DATABASE_URL_CORE_ADMIN manquant");
  if (!corpusAvailable()) throw new Error("Corpus de référence introuvable (ressources/)");
  const ring = keyRingFromEnv({ FIELD_ENCRYPTION_KEY: process.env["FIELD_ENCRYPTION_KEY"] ?? "", FIELD_ENCRYPTION_KEY_ID: process.env["FIELD_ENCRYPTION_KEY_ID"] });
  if (!process.env["FIELD_ENCRYPTION_KEY"]) throw new Error("FIELD_ENCRYPTION_KEY manquant");
  const sql = postgres(url, { max: 3, prepare: false });
  const db = drizzle(sql, { schema: s });
  const secret = process.env["DEMO_CREDENTIALS_SECRET"] ?? randomBytes(24).toString("base64url");
  const credentials: Record<string, string> = {};
  const now = new Date();

  const existing = await sql`select 1 from app_user where email = 'admin@demo.dealpme.local' limit 1`;
  if (existing.length > 0) {
    console.log("Jeu de démonstration déjà présent, rien à faire.");
    await sql.end();
    return;
  }

  const users: { email: string; org: string; roles: Role[]; channel: string; person: string }[] = [
    { email: "admin@demo.dealpme.local", org: "DealPME (démonstration)", roles: [Role.PLATFORM_ADMIN], channel: "INTERNAL", person: "Administrateur de démonstration" },
    { email: "officier@cci-togo.demo.dealpme.local", org: "CCI-Togo (démonstration)", roles: [Role.CCI_OFFICER], channel: "INSTITUTION", person: "Officier CCI-Togo de démonstration" },
    { email: "conformite@demo.dealpme.local", org: "DealPME (démonstration)", roles: [Role.COMPLIANCE_OPERATOR], channel: "INTERNAL", person: "Opérateur de conformité de démonstration" },
    { email: "cedant.tropicvale@demo.dealpme.local", org: "TropicVale Industries SA (démonstration)", roles: [Role.SELLER], channel: "CCI_CAMPAIGN", person: "Cédant TropicVale (synthétique)" },
    { email: "cedant.froidroute@demo.dealpme.local", org: "FroidRoute Logistics SARL (démonstration)", roles: [Role.SELLER], channel: "CCI_CAMPAIGN", person: "Cédant FroidRoute (synthétique)" },
    { email: "cedant.betonplus@demo.dealpme.local", org: "BétonPlus Préfabriqués SARL (démonstration)", roles: [Role.SELLER], channel: "SELF_REGISTRATION", person: "Cédant BétonPlus (synthétique)" },
    { email: "cedant.fleetrelance@demo.dealpme.local", org: "FleetRelance Togo SARL (démonstration)", roles: [Role.SELLER], channel: "SELF_REGISTRATION", person: "Cédant FleetRelance (synthétique)" },
    { email: "investisseur@demo.dealpme.local", org: "Investisseur régional (démonstration)", roles: [Role.INVESTOR], channel: "SELF_REGISTRATION", person: "Investisseur de démonstration" },
    { email: "diaspora@demo.dealpme.local", org: "Investisseur diaspora (démonstration)", roles: [Role.INVESTOR_DIASPORA], channel: "DIASPORA_CAMPAIGN", person: "Investisseur diaspora de démonstration" },
  ];
  const ids: Record<string, { userId: string; orgId: string; personId: string }> = {};
  for (const u of users) {
    const orgId = newId();
    const personId = newId();
    const userId = newId();
    await db.insert(s.organisations).values({ id: orgId, name: u.org, attributionChannel: u.channel, cciMemberConfirmationRef: u.channel === "CCI_CAMPAIGN" ? `CCIT-${userId.slice(0, 8).toUpperCase()}` : null });
    await db.insert(s.persons).values({ id: personId, legalName: u.person });
    const password = demoPassword(secret, u.email);
    credentials[u.email] = password;
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await db.insert(s.users).values({ id: userId, organisationId: orgId, personId, email: u.email, emailVerifiedAt: now, phoneE164: "+22890000000", phoneVerifiedAt: now, passwordHash, roles: u.roles, consentTermsAt: now, consentPrivacyAt: now });
    await db.insert(s.subscriptions).values({ id: newId(), organisationId: orgId, tier: u.roles.includes(Role.SELLER) ? "PREMIUM" : "BUSINESS", entitlementsVersion: "2026-06-25", periodStart: now, periodEnd: new Date(now.getTime() + 30 * 86_400_000) });
    ids[u.email] = { userId, orgId, personId };
  }
  const officer = ids["officier@cci-togo.demo.dealpme.local"]!;

  // certified : la certification Deal-Ready du jeu de démonstration. Les fixtures de référence ne certifient
  // aucun des dossiers publiés, si bien que le badge n'apparaîtrait jamais sur la place de marché. PT-003 est
  // certifié ici pour que la démonstration montre les deux états côte à côte ; les fixtures restent intactes,
  // elles demeurent l'oracle des tests (décision A12 du classeur).
  const cases: { caseId: string; seller: string; regionCode: RegionCode; rccm: string; status: DealStatus; certified?: boolean }[] = [
    { caseId: "PT-001", seller: "cedant.tropicvale@demo.dealpme.local", regionCode: RegionCode.GRAND_LOME, rccm: "TG-LOM-2010-B-1001", status: DealStatus.VERIFIED },
    { caseId: "PT-003", seller: "cedant.froidroute@demo.dealpme.local", regionCode: RegionCode.MARITIME, rccm: "TG-LOM-2015-B-3003", status: DealStatus.LISTED_OPEN, certified: true },
    { caseId: "PT-006", seller: "cedant.betonplus@demo.dealpme.local", regionCode: RegionCode.PLATEAUX, rccm: "TG-LOM-2012-B-6006", status: DealStatus.LISTED_OPEN },
    { caseId: "PT-012", seller: "cedant.fleetrelance@demo.dealpme.local", regionCode: RegionCode.GRAND_LOME, rccm: "TG-LOM-2009-B-1212", status: DealStatus.LISTED_OPEN },
  ];
  const DEMO_SCOPE =
    "Existence juridique, immatriculation au RCCM et complétude documentaire vérifiées par la CCI-Togo. Ne portent ni sur l'exactitude des états financiers, ni sur l'absence de litige, ni sur la valeur de l'entreprise.";
  const created: { caseId: string; dealId: string; companyId: string; ownerOrgId: string; status: DealStatus; dealType: DealType }[] = [];
  for (const c of cases) {
    const fx = loadPassTransmissionFixture<Fixture>(c.caseId);
    const owner = ids[c.seller]!;
    const companyId = newId();
    const lf = legalForm(fx.transaction_workspace.legal_form);
    await db.insert(s.companies).values({ id: companyId, ownerOrganisationId: owner.orgId, legalName: fx.master.company, legalForm: lf, rccmNumber: c.rccm });
    const registryId = newId();
    await db.insert(s.registryRecords).values({ id: registryId, companyId, rccmNumber: c.rccm, legalName: fx.master.company, legalForm: lf, status: "ACTIVE", registeredAddress: `${fx.master.city}, Togo (synthétique)`, officers: ["Dirigeant de démonstration"], verifiedAt: now, verifiedBy: officer.userId, sourceRef: `CONSULTATION-OPERATEUR-${c.caseId}`, mode: "manual" });
    await sql`update company set registry_record_id = ${registryId} where id = ${companyId}`;
    await db.insert(s.membershipConfirmations).values({ id: newId(), organisationId: owner.orgId, confirmationRef: `CCIT-MEMBRE-${c.caseId}`, confirmedBy: officer.userId });
    if (fx.deal_ready.certification_awarded) {
      await db.insert(s.certifications).values({ id: newId(), companyId, scopeStatement: fx.deal_ready.scope_statement, decision: "GRANTED", officerUserId: officer.userId, decidedAt: new Date(fx.deal_ready.decision_date), expiresAt: new Date(fx.deal_ready.expiry_date) });
    } else if (c.certified) {
      // Décision valable un an à partir de la veille : le badge est en cours de validité pendant la démonstration.
      await db.insert(s.certifications).values({
        id: newId(),
        companyId,
        scopeStatement: DEMO_SCOPE,
        decision: "GRANTED",
        officerUserId: officer.userId,
        decidedAt: new Date(now.getTime() - 86_400_000),
        expiresAt: new Date(now.getTime() + 365 * 86_400_000),
      });
    }
    const dealId = newId();
    const dealType = fx.master.deal_type === "SHARE_DEAL" ? DealType.SHARE_DEAL : DealType.ASSET_DEAL;
    await db.insert(s.deals).values({
      id: dealId,
      companyId,
      sellerOrganisationId: owner.orgId,
      dealType,
      status: c.status,
      visibility: c.status === DealStatus.LISTED_OPEN ? "OPEN" : "DRAFT",
      sectorCode: sectorCode(fx.master.sector),
      regionCode: c.regionCode,
      turnoverBand: band(fx.master.revenue_2025),
      askingPriceEnc: encryptInt(ring, fx.master.asking * 1_000_000),
      valuationBasisEnc: encryptField(ring, "Attente du cédant (SELLER_EXPECTATION), pas une valorisation DealPME ; source : fixture synthétique " + c.caseId),
    });
    if (dealType === DealType.ASSET_DEAL) {
      await db.insert(s.assetDealDetails).values({ dealId, assetsDescription: `Fonds de commerce et actifs d'exploitation (synthétique ${c.caseId})`, includesGoodwill: true });
    } else {
      await db.insert(s.shareDealDetails).values({ dealId, legalForm: lf, apeEligible: false, securityType: "ACTIONS", stakePercentEnc: encryptInt(ring, fx.transaction_workspace.stake_offered_pct)!, transferRestrictionsEnc: encryptField(ring, "Clause d'agrément statutaire (synthétique)") });
    }
    await db.insert(s.dealEvents).values({ id: newId(), dealId, fromStatus: null, toStatus: DealStatus.DRAFT, actorUserId: owner.userId, reason: "Création du dossier (jeu de démonstration)" });
    if (c.status !== DealStatus.DRAFT) {
      await db.insert(s.dealEvents).values({ id: newId(), dealId, fromStatus: DealStatus.DRAFT, toStatus: c.status, actorUserId: officer.userId, reason: "Jeu de démonstration" });
    }
    created.push({ caseId: c.caseId, dealId, companyId, ownerOrgId: owner.orgId, status: c.status, dealType });
    console.log(`${c.caseId} ${fx.master.company} : ${dealType} ${c.status}`);
  }

  // Activité de démonstration : sans elle, les écrans d'audience, de messagerie et d'instruction sont vides
  // et la présentation ne montre que des états initiaux. Tout est synthétique et daté de la veille.
  const investor = ids["investisseur@demo.dealpme.local"];
  const listed = created.filter((c) => c.status === DealStatus.LISTED_OPEN);
  if (investor && listed.length > 0) {
    const veille = new Date(now.getTime() - 86_400_000);
    for (const [index, deal] of listed.entries()) {
      // Consultations : quelques passages anonymes et un passage identifié.
      for (let i = 0; i < 3 + index * 2; i += 1) {
        await db.insert(s.dealViews).values({ id: newId(), dealId: deal.dealId, viewerUserId: null, viewerOrganisationId: null, viewedAt: new Date(veille.getTime() + i * 3_600_000) });
      }
      await db.insert(s.dealViews).values({ id: newId(), dealId: deal.dealId, viewerUserId: investor.userId, viewerOrganisationId: investor.orgId, viewedAt: veille });
    }
    const premier = listed[0]!;
    const interestId = newId();
    await db.insert(s.interests).values({
      id: interestId,
      dealId: premier.dealId,
      investorUserId: investor.userId,
      message: "Reprise envisagée au premier semestre 2027, financement bancaire en cours de montage.",
      createdAt: veille,
    });
    await db.insert(s.dealMessages).values({
      id: newId(),
      dealId: premier.dealId,
      interestId,
      senderUserId: investor.userId,
      senderOrganisationId: investor.orgId,
      body: "Bonjour, votre dossier correspond à notre thèse. Seriez-vous disponible pour un échange la semaine prochaine ?",
      createdAt: veille,
    });
    const vendeur = users.find((u) => u.org.startsWith(premier.caseId) || true);
    void vendeur;
    await db.insert(s.savedAlerts).values({
      id: newId(),
      userId: investor.userId,
      organisationId: investor.orgId,
      label: "Logistique et transport, région Maritime",
      sectorCode: "LOGIST",
      regionCode: "MARITIME",
      turnoverBand: null,
      dealReadyOnly: true,
      notifyOptIn: false,
      optInAt: null,
      createdAt: veille,
    });
  }

  // Une demande de certification en attente de compléments : la file de l'officier n'est pas vide.
  const enInstruction = created.find((c) => c.caseId === "PT-006");
  if (enInstruction) {
    const owner = Object.values(ids).find((v) => v.orgId === enInstruction.ownerOrgId);
    if (owner) {
      await db.insert(s.certificationRequests).values({
        id: newId(),
        companyId: enInstruction.companyId,
        state: "REMEDIATION_REQUIRED",
        message: "Transmission prévue au premier trimestre 2027.",
        remediationItems: [
          { label: "Attestation de régularité fiscale expirée", detail: "La pièce déposée date de 2024. Fournir une attestation de moins de trois mois." },
          { label: "Statuts non signés", detail: "L'exemplaire déposé ne porte pas la signature du gérant." },
        ],
        remediationSetBy: officer.userId,
        remediationSetAt: new Date(now.getTime() - 43_200_000),
        requestedBy: owner.userId,
        requestedAt: new Date(now.getTime() - 172_800_000),
      });
    }
  }

  await db.insert(s.events).values({
    id: newId(),
    title: "Salon B2B agro-industrie UEMOA (démonstration)",
    description: "Rencontres acheteurs / fournisseurs, session live hébergée sur Remo.co. Aucun contenu à caractère de titre financier.",
    startsAt: new Date("2026-10-22T09:00:00Z"),
    endsAt: new Date("2026-10-22T13:00:00Z"),
    capacity: 150,
    integrationMode: "DEALPME_FIRST",
    organiserUserId: officer.userId,
    campaignId: "SALON-AGRO-2026",
    status: "DRAFT",
  });

  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2) + "\n", { mode: 0o600 });
  console.log(`Jeu de démonstration créé : ${users.length} comptes, ${cases.length} dossiers. Mots de passe uniques écrits dans ${CREDENTIALS_FILE} (lecture propriétaire seulement).`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
