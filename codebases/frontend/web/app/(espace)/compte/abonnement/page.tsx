import { redirect } from "next/navigation";
import { Panel, StateBanner, StatusBadge } from "@dealpme/ui";
import { api, ApiError } from "../../../../lib/api";
import { fmtDate } from "../../../../lib/guards";
import { fmtXof } from "../../../../lib/dossier";
import { getSession } from "../../../../lib/session";

type Tier = "STARTER" | "BUSINESS" | "PREMIUM" | "ELITE";

interface Entitlements {
  monthlyPriceXof: number;
  taxCompliance: string;
  legalDocsPerMonth: number | "UNLIMITED";
  legalCounselReview: boolean;
  b2bNetworking: string;
  rebound: string;
  diaspora: string;
  dealReady: string;
  passTransmission: string;
}

interface Subscription {
  tier: Tier;
  paymentState: string;
  periodStart: string;
  periodEnd: string;
  expired: boolean;
  entitlementsVersion: string;
  currentVersion: string;
  entitlements: Entitlements;
  grid: Record<Tier, Entitlements>;
}

const TIERS: Tier[] = ["STARTER", "BUSINESS", "PREMIUM", "ELITE"];

const PAYMENT_STATE: Record<string, string> = {
  PAID: "À jour",
  GRACE_READ_ONLY: "Période de grâce : lecture seule",
  GRACE_TEASER_ONLY: "Période de grâce : palier T0 seulement",
  SUSPENDED: "Suspendu",
};

const ROWS: { key: keyof Entitlements; label: string }[] = [
  { key: "monthlyPriceXof", label: "Prix mensuel" },
  { key: "passTransmission", label: "Pass Transmission" },
  { key: "dealReady", label: "Deal-Ready" },
  { key: "taxCompliance", label: "Conformité fiscale" },
  { key: "legalDocsPerMonth", label: "Documents juridiques par mois" },
  { key: "legalCounselReview", label: "Revue par un conseil juridique" },
  { key: "b2bNetworking", label: "Deal-Connect" },
  { key: "rebound", label: "Alerte et Rebond" },
  { key: "diaspora", label: "Guichet Diaspora" },
];

const VALUE_LABEL: Record<string, string> = {
  NONE: "Non inclus",
  UNLIMITED: "Illimité",
  STANDARD_ALERTS: "Alertes standard",
  SIMPLIFIED_FILING: "Télédéclaration simplifiée",
  EXPERT_ASSISTANCE: "Assistance d'un expert",
  UNLIMITED_MULTI_SITE: "Illimité, multi-sites",
  VISITOR: "Visiteur",
  STANDARD_EXHIBITOR: "Exposant standard",
  VIP_EXHIBITOR: "Exposant VIP",
  PRINCIPAL_SPONSOR: "Sponsor principal",
  SELF_DIAGNOSTIC: "Autodiagnostic",
  ASSET_LISTING: "Publication d'actifs",
  CRISIS_UNIT: "Cellule de crise",
  RESTRUCTURING_MANDATE: "Mandat de restructuration",
  CONSULTATION_ONLY: "Consultation seule",
  INTRODUCTIONS_5_PER_MONTH: "5 mises en relation par mois",
  UNLIMITED_DATA_ROOM: "Data room illimitée",
  AUDIT_INCLUDED: "Audit inclus",
  PRIORITY_WITH_VIDEO: "Priorité avec vidéo",
  LISTING_ACCESS: "Accès aux publications",
  EXCLUSIVE_MANDATE: "Mandat exclusif",
};

function render(key: keyof Entitlements, value: unknown): string {
  if (key === "monthlyPriceXof") return `${fmtXof(Number(value))} par mois`;
  if (typeof value === "boolean") return value ? "Incluse" : "Non incluse";
  if (typeof value === "number") return String(value);
  return VALUE_LABEL[String(value)] ?? String(value);
}

/** Palier d'abonnement et droits associés. V1 n'encaisse aucun paiement : le palier est posé par l'administration. */
export default async function SubscriptionPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  let sub: Subscription | null = null;
  let error: string | null = null;
  try {
    sub = await api<Subscription>("/subscription", { token: session.token });
  } catch (e) {
    error = e instanceof ApiError && e.status === 404 ? "Aucun abonnement n'est enregistré pour votre organisation." : "Service indisponible";
  }

  return (
    <div className="dp-stack" style={{ maxWidth: 980 }}>
      <div>
        <h1>Abonnement</h1>
        <p className="dp-muted">
          Le palier détermine les services ouverts à votre organisation. En V1, aucun paiement n'est encaissé par la
          plateforme : le palier est posé par l'administration DealPME.
        </p>
      </div>
      {error ? <StateBanner tone="warning" title="Abonnement indisponible" controlId="SUB_ERROR">{error}</StateBanner> : null}

      {sub ? (
        <>
          <Panel title="Votre palier" controlId="SUB_CURRENT">
            <div className="dp-actions" style={{ alignItems: "center" }}>
              <StatusBadge status={sub.paymentState === "PAID" && !sub.expired ? "verified" : "pending"} label={sub.tier} controlId="SUB_TIER" />
              <span>{PAYMENT_STATE[sub.paymentState] ?? sub.paymentState}</span>
              <span className="dp-muted">
                du {fmtDate(sub.periodStart)} au {fmtDate(sub.periodEnd)}
              </span>
            </div>
            {sub.expired ? (
              <StateBanner tone="warning" title="Période échue" controlId="SUB_EXPIRED">
                La période couverte est terminée. Les services restent ouverts pendant la démonstration ; en production,
                un palier échu bascule en lecture seule avant d'être suspendu.
              </StateBanner>
            ) : null}
            {sub.entitlementsVersion !== sub.currentVersion ? (
              <StateBanner tone="info" title="Grille de droits antérieure" controlId="SUB_VERSION">
                Votre abonnement a été souscrit sous la grille {sub.entitlementsVersion} ; la grille en vigueur est la{" "}
                {sub.currentVersion}. Vos droits restent ceux de votre grille jusqu'au renouvellement.
              </StateBanner>
            ) : null}
          </Panel>

          <Panel title="Ce que couvre chaque palier" controlId="SUB_GRID">
            <div className="dp-tablewrap">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    {TIERS.map((t) => (
                      <th key={t} style={t === sub.tier ? { background: "var(--dp-canvas)" } : undefined}>
                        {t}
                        {t === sub.tier ? <div className="dp-muted" style={{ fontSize: "0.72rem" }}>votre palier</div> : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      {TIERS.map((t) => (
                        <td key={t} style={t === sub.tier ? { background: "var(--dp-canvas)", fontWeight: 600 } : undefined}>
                          {render(row.key, sub.grid[t][row.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="dp-muted" style={{ marginBottom: 0, fontSize: "0.82rem" }}>
              Grille {sub.currentVersion}. Les prix sont mensuels, en FCFA, prépayés : la plateforme ne met en place
              aucun prélèvement récurrent.
            </p>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
