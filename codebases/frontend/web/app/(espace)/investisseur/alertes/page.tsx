import { Panel, StateBanner } from "@dealpme/ui";
import { api, ApiError } from "../../../../lib/api";
import { fmtDate, requireRole } from "../../../../lib/guards";
import { BAND_LABEL, REGION_LABEL, SECTORS } from "../../../../lib/dossier";
import { AlertRow } from "./alert-row";

interface Alert {
  id: string;
  label: string;
  sectorCode: string | null;
  regionCode: string | null;
  turnoverBand: string | null;
  dealReadyOnly: boolean;
  notifyOptIn: boolean;
  optInAt: string | null;
  createdAt: string;
}

const SECTOR_LABEL = new Map(SECTORS.map((s) => [s.code, s.label]));

/** Alertes enregistrées. Le consentement est visible, daté et révocable ligne par ligne. */
export default async function AlertsPage() {
  const { token } = await requireRole("INVESTOR", "INVESTOR_DIASPORA", "BANK", "ADVISOR");
  let items: Alert[] = [];
  let error: string | null = null;
  try {
    items = (await api<{ items: Alert[] }>("/alerts", { token })).items;
  } catch (e) {
    error = e instanceof ApiError ? e.envelope.message : "Service indisponible";
  }

  return (
    <div className="dp-stack">
      <div>
        <h1>Mes alertes</h1>
        <p className="dp-muted">
          Une alerte conserve des critères de recherche. Elle n'envoie rien tant que vous n'avez pas donné votre
          consentement, et celui-ci se retire à tout moment sans supprimer l'alerte.
        </p>
      </div>
      {error ? <StateBanner tone="warning" title="Alertes indisponibles" controlId="INV_ALERTS_ERROR">{error}</StateBanner> : null}
      {!error && items.length === 0 ? (
        <StateBanner tone="info" title="Aucune alerte enregistrée" controlId="INV_ALERTS_EMPTY">
          Depuis la <a href="/opportunites">place de marché</a>, filtrez puis enregistrez la recherche.
        </StateBanner>
      ) : null}

      {items.length > 0 ? (
        <Panel title="Alertes" controlId="INV_ALERTS">
          <div className="dp-tablewrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Critères</th>
                  <th>Créée le</th>
                  <th>Notification</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} data-control-id="INV_ALERT_ROW">
                    <td>
                      <b>{a.label}</b>
                    </td>
                    <td>
                      {[
                        a.sectorCode ? (SECTOR_LABEL.get(a.sectorCode) ?? a.sectorCode) : null,
                        a.regionCode ? (REGION_LABEL[a.regionCode] ?? a.regionCode) : null,
                        a.turnoverBand ? (BAND_LABEL[a.turnoverBand] ?? a.turnoverBand) : null,
                        a.dealReadyOnly ? "Deal-Ready uniquement" : null,
                      ]
                        .filter(Boolean)
                        .join(" - ") || "Tous les critères"}
                    </td>
                    <td>{fmtDate(a.createdAt)}</td>
                    <td>
                      {a.notifyOptIn ? (
                        <>
                          <span className="dp-badge" data-tone="success">Consentie</span>
                          <div className="dp-muted" style={{ fontSize: "0.78rem" }}>le {fmtDate(a.optInAt)}</div>
                        </>
                      ) : (
                        <span className="dp-badge" data-tone="neutral">Muette</span>
                      )}
                    </td>
                    <td>
                      <AlertRow alertId={a.id} optIn={a.notifyOptIn} />
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
