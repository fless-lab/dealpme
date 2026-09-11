import { Metric, Metrics, Panel, StateBanner, StatusBadge } from "@dealpme/ui";
import { api, ApiError } from "../../../../lib/api";
import { requireRole } from "../../../../lib/guards";
import { BAND_LABEL, DEAL_STATUS_LABEL, REGION_LABEL, SECTORS } from "../../../../lib/dossier";

export const metadata = { title: "Audience de mes dossiers", description: "Consultations et manifestations d'intérêt reçues." };

interface Row {
  id: string;
  status: string;
  dealType: string;
  sectorCode: string;
  regionCode: string;
  turnoverBand: string;
  views: number;
  viewers: number;
  interests: number;
  messages: number;
}

const SECTOR_LABEL = new Map(SECTORS.map((s) => [s.code, s.label]));

/**
 * Audience des dossiers du cédant. Les compteurs viennent des tables qui les portent, en append-only :
 * une consultation ne se supprime pas, un compteur qui se corrige n'est plus un compteur.
 */
export default async function SellerDashboardPage() {
  const { token } = await requireRole("SELLER", "ADVISOR");
  let items: Row[] = [];
  let error: string | null = null;
  try {
    items = (await api<{ items: Row[] }>("/seller/dashboard", { token })).items;
  } catch (e) {
    error = e instanceof ApiError ? e.envelope.message : "Service indisponible";
  }
  const published = items.filter((i) => i.status.startsWith("LISTED") || ["ENGAGED", "DUE_DILIGENCE", "NEGOTIATION"].includes(i.status));
  const totals = items.reduce((acc, i) => ({ views: acc.views + i.views, interests: acc.interests + i.interests, messages: acc.messages + i.messages }), { views: 0, interests: 0, messages: 0 });

  return (
    <div className="dp-stack">
      <div>
        <h1>Audience de mes dossiers</h1>
        <p className="dp-muted">
          Consultations et manifestations d'intérêt reçues. L'identité des personnes qui consultent ne vous est pas
          communiquée : seule leur existence est comptée.
        </p>
      </div>
      {error ? <StateBanner tone="warning" title="Compteurs indisponibles" controlId="SELLER_DASH_ERROR">{error}</StateBanner> : null}
      {!error && items.length === 0 ? <StateBanner tone="info" title="Aucun dossier pour le moment" controlId="SELLER_DASH_EMPTY" /> : null}

      {items.length > 0 ? (
        <>
          <Metrics>
            <Metric label="Dossiers publiés" value={String(published.length)} note={`${items.length} dossier(s) au total`} />
            <Metric label="Consultations" value={String(totals.views)} />
            <Metric label="Intérêts reçus" value={String(totals.interests)} tone={totals.interests > 0 ? "neutral" : "warning"} />
            <Metric label="Messages échangés" value={String(totals.messages)} />
          </Metrics>

          <Panel title="Par dossier" controlId="SELLER_DASH_TABLE">
            <div className="dp-tablewrap">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th scope="col">Dossier</th>
                    <th scope="col">État</th>
                    <th scope="col" className="dp-num">Consultations</th>
                    <th scope="col" className="dp-num">Dont identifiées</th>
                    <th scope="col" className="dp-num">Intérêts</th>
                    <th scope="col" className="dp-num">Messages</th>
                    <th scope="col"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => (
                    <tr key={d.id} data-control-id="SELLER_DASH_ROW">
                      <td>
                        {SECTOR_LABEL.get(d.sectorCode) ?? d.sectorCode}
                        <div className="dp-muted" style={{ fontSize: "0.78rem" }}>
                          {REGION_LABEL[d.regionCode] ?? d.regionCode} - {BAND_LABEL[d.turnoverBand] ?? d.turnoverBand}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={d.status === "DRAFT" ? "neutral" : d.status === "PENDING_VERIFICATION" ? "pending" : "verified"} label={DEAL_STATUS_LABEL[d.status] ?? d.status} />
                      </td>
                      <td className="dp-num">{d.views}</td>
                      <td className="dp-num">{d.viewers}</td>
                      <td className="dp-num">{d.interests}</td>
                      <td className="dp-num">{d.messages}</td>
                      <td>
                        <a className="dp-btn dp-btn-ghost" href={`/cedant/${d.id}/audience`} data-control-id="SELLER_DASH_OPEN">
                          Détail
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
