import { Panel, StateBanner, StatusBadge } from "@dealpme/ui";
import { api, ApiError } from "../../../lib/api";
import { fmtDateTime, requireRole } from "../../../lib/guards";
import { BAND_LABEL, DEAL_STATUS_LABEL, REGION_LABEL, SECTORS } from "../../../lib/dossier";

interface InterestRow {
  id: string;
  dealId: string;
  message: string | null;
  createdAt: string;
  status: string;
  dealType: string;
  sectorCode: string;
  regionCode: string;
  turnoverBand: string;
  messages: number;
}

const SECTOR_LABEL = new Map(SECTORS.map((s) => [s.code, s.label]));

/** Intérêts manifestés par l'investisseur, avec l'état du dossier au palier qui lui est ouvert. */
export default async function InvestorHomePage() {
  const { token } = await requireRole("INVESTOR", "INVESTOR_DIASPORA", "BANK", "ADVISOR");
  let items: InterestRow[] = [];
  let error: string | null = null;
  try {
    items = (await api<{ items: InterestRow[] }>("/interests", { token })).items;
  } catch (e) {
    error = e instanceof ApiError ? e.envelope.message : "Service indisponible";
  }

  return (
    <div className="dp-stack">
      <div>
        <h1>Mes intérêts</h1>
        <p className="dp-muted">
          Les opportunités sur lesquelles vous vous êtes manifesté. Tant que le cédant ne vous a pas qualifié et
          qu'aucun accord de confidentialité n'est signé, seul le palier T0 vous est ouvert.
        </p>
      </div>
      {error ? <StateBanner tone="warning" title="Liste indisponible" controlId="INV_LIST_ERROR">{error}</StateBanner> : null}
      {!error && items.length === 0 ? (
        <StateBanner tone="info" title="Aucun intérêt manifesté" controlId="INV_LIST_EMPTY">
          Parcourez la <a href="/opportunites">place de marché</a> et manifestez votre intérêt sur les dossiers qui
          correspondent à votre thèse de reprise.
        </StateBanner>
      ) : null}

      {items.length > 0 ? (
        <Panel title="Dossiers suivis" controlId="INV_INTERESTS">
          <div className="dp-tablewrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>Opportunité</th>
                  <th>Type</th>
                  <th>État du dossier</th>
                  <th>Manifesté le</th>
                  <th className="dp-num">Messages</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} data-control-id="INV_INTEREST_ROW">
                    <td>
                      <b>{SECTOR_LABEL.get(i.sectorCode) ?? i.sectorCode}</b>
                      <div className="dp-muted" style={{ fontSize: "0.78rem" }}>
                        {REGION_LABEL[i.regionCode] ?? i.regionCode} - {BAND_LABEL[i.turnoverBand] ?? i.turnoverBand}
                      </div>
                    </td>
                    <td>{i.dealType === "ASSET_DEAL" ? "Cession d'actifs" : "Cession de titres"}</td>
                    <td>
                      <StatusBadge status={i.status.startsWith("LISTED") ? "verified" : "pending"} label={DEAL_STATUS_LABEL[i.status] ?? i.status} />
                    </td>
                    <td>{fmtDateTime(i.createdAt)}</td>
                    <td className="dp-num">{i.messages}</td>
                    <td>
                      <a className="dp-btn dp-btn-secondary" href={`/opportunites/${i.dealId}`} data-control-id="INV_INTEREST_OPEN">
                        Ouvrir
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
