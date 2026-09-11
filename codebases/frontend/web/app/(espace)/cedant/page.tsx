import { StateBanner, StatusBadge } from "@dealpme/ui";
import { api, ApiError } from "../../../lib/api";
import { fmtDate, requireRole } from "../../../lib/guards";
import { BAND_LABEL, DEAL_STATUS_LABEL, REGION_LABEL, SECTORS } from "../../../lib/dossier";

export const metadata = { title: "Mes dossiers", description: "Dossiers de transmission de votre organisation." };

interface DealRow {
  id: string;
  companyName: string;
  dealType: "ASSET_DEAL" | "SHARE_DEAL";
  status: string;
  sectorCode: string;
  regionCode: string;
  turnoverBand: string;
  createdAt: string;
}

const SECTOR_LABEL = new Map(SECTORS.map((s) => [s.code, s.label]));

function statusTone(status: string): "verified" | "pending" | "neutral" | "revoked" {
  if (status === "DRAFT") return "neutral";
  if (status === "PENDING_VERIFICATION") return "pending";
  if (status === "ABANDONED") return "revoked";
  return "verified";
}

/** Espace cédant : les dossiers de l'organisation, jamais ceux d'un autre cédant (isolation au niveau des lignes). */
export default async function CedantHomePage() {
  const { token } = await requireRole("SELLER", "ADVISOR");
  let items: DealRow[] = [];
  let error: string | null = null;
  try {
    items = (await api<{ items: DealRow[] }>("/deals", { token })).items;
  } catch (e) {
    error = e instanceof ApiError ? e.envelope.message : "Service indisponible";
  }
  return (
    <div className="dp-stack">
      <div>
        <h1>Mes dossiers</h1>
        <p className="dp-muted">
          Un dossier par entreprise à transmettre. Tant qu'il est en préparation, rien n'est visible par un repreneur.
        </p>
      </div>
      {error ? <StateBanner tone="warning" title="Dossiers indisponibles" controlId="SELLER_LIST_ERROR">{error}</StateBanner> : null}
      <div className="dp-actions">
        <a className="dp-btn dp-btn-primary" href="/cedant/nouveau" data-control-id="SELLER_NEW_DOSSIER">
          Commencer un dossier
        </a>
        <a className="dp-btn dp-btn-secondary" href="/cedant/tableau-de-bord" data-control-id="SELLER_DASHBOARD">
          Audience de mes dossiers
        </a>
      </div>
      {!error && items.length === 0 ? (
        <StateBanner tone="info" title="Aucun dossier pour le moment" controlId="SELLER_LIST_EMPTY">
          Le premier dossier prend une quinzaine de minutes : l'entreprise, l'activité, quelques chiffres et les pièces justificatives.
        </StateBanner>
      ) : null}
      {items.length > 0 ? (
        <div className="dp-tablewrap">
          <table className="dp-table">
            <thead>
              <tr>
                <th scope="col">Entreprise</th>
                <th scope="col">Type de cession</th>
                <th scope="col">Secteur et région</th>
                <th scope="col">Tranche de chiffre d'affaires</th>
                <th scope="col">État</th>
                <th scope="col">Créé le</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} data-control-id="SELLER_DOSSIER_ROW">
                  <td>
                    <b>{d.companyName}</b>
                  </td>
                  <td>{d.dealType === "ASSET_DEAL" ? "Cession d'actifs" : "Cession de titres"}</td>
                  <td>
                    {SECTOR_LABEL.get(d.sectorCode) ?? d.sectorCode}
                    <div className="dp-muted" style={{ fontSize: "0.78rem" }}>{REGION_LABEL[d.regionCode] ?? d.regionCode}</div>
                  </td>
                  <td>{BAND_LABEL[d.turnoverBand] ?? d.turnoverBand}</td>
                  <td>
                    <StatusBadge status={statusTone(d.status)} label={DEAL_STATUS_LABEL[d.status] ?? d.status} />
                  </td>
                  <td>{fmtDate(d.createdAt)}</td>
                  <td>
                    <a className="dp-btn dp-btn-secondary" href={`/cedant/${d.id}/identite`} data-control-id="SELLER_DOSSIER_OPEN">
                      Ouvrir
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
