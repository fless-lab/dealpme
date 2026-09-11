import { Metric, Metrics, Panel, StateBanner } from "@dealpme/ui";
import { api, ApiError } from "../../../lib/api";
import { requireRole } from "../../../lib/guards";

export const metadata = { title: "Console CCI-Togo", description: "Vue agrégée du pilote." };

interface Overview {
  organisations: { total: number; membershipConfirmed: number };
  companies: { total: number; registryVerified: number; dealReady: number };
  certifications: { decisionsThisMonth: number };
  deals: Record<string, number>;
}

const DEAL_STATUS: Record<string, string> = {
  DRAFT: "Dossiers en préparation",
  VERIFIED: "Dossiers vérifiés",
  LISTED_OPEN: "Publiés (marché ouvert)",
  LISTED_RESTRICTED: "Publiés en cercle restreint",
  ENGAGED: "Mise en relation engagée",
  DUE_DILIGENCE: "Audit d'acquisition",
  NEGOTIATION: "Négociation",
  CLOSED_REPORTED: "Transmissions déclarées",
};

/** Tableau de bord institutionnel : compteurs agrégés. Aucune vue sur le contenu confidentiel d'un dossier. */
export default async function CciOverviewPage() {
  const { token } = await requireRole("CCI_OFFICER");
  let data: Overview | null = null;
  let error: string | null = null;
  try {
    data = await api<Overview>("/institution/overview", { token });
  } catch (e) {
    error = e instanceof ApiError ? e.envelope.message : "Service indisponible";
  }
  return (
    <div className="dp-stack">
      <div>
        <h1>Console CCI-Togo</h1>
        <p className="dp-muted">
          Vue agrégée du pilote. La console ne donne accès ni aux pièces d'un dossier, ni au prix, ni à l'identité d'un
          repreneur : elle porte les décisions institutionnelles et leur traçabilité.
        </p>
      </div>
      {error ? <StateBanner tone="warning" title="Chiffres indisponibles" controlId="CCI_OVERVIEW_ERROR">{error}</StateBanner> : null}
      {data ? (
        <>
          <Metrics>
            <Metric label="Organisations inscrites" value={String(data.organisations.total)} note={`${data.organisations.membershipConfirmed} adhésion(s) confirmée(s)`} />
            <Metric label="Entreprises déclarées" value={String(data.companies.total)} />
            <Metric label="Vérifications RCCM / CFE" value={String(data.companies.registryVerified)} tone={data.companies.registryVerified < data.companies.total ? "warning" : "neutral"} note={`${data.companies.total - data.companies.registryVerified} en attente`} />
            <Metric label="Entreprises Deal-Ready" value={String(data.companies.dealReady)} note="Certification en cours de validité" />
            <Metric label="Décisions ce mois" value={String(data.certifications.decisionsThisMonth)} />
          </Metrics>
          <Panel title="Dossiers par état" controlId="CCI_OVERVIEW_DEALS">
            {Object.keys(data.deals).length === 0 ? (
              <StateBanner tone="info" title="Aucun dossier enregistré" controlId="CCI_OVERVIEW_DEALS_EMPTY" />
            ) : (
              <div className="dp-tablewrap">
                <table className="dp-table">
                  <thead>
                    <tr>
                      <th scope="col">État</th>
                      <th scope="col" className="dp-num">Dossiers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.deals).map(([status, n]) => (
                      <tr key={status}>
                        <td>{DEAL_STATUS[status] ?? status}</td>
                        <td className="dp-num">{n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
