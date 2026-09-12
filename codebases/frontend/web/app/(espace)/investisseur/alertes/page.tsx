import { Panel, StateBanner } from "@dealpme/ui";
import { api, ApiError } from "../../../../lib/api";
import { fmtDate, requireRole } from "../../../../lib/guards";
import { BAND_LABEL, REGION_LABEL, SECTORS } from "../../../../lib/dossier";
import { AlertRow } from "./alert-row";

export const metadata = { title: "Mes alertes", description: "Recherches enregistrées et consentement de notification." };

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
interface Delivery { id: string; alertId: string; score: number; reasons: string[]; state: string; attempts: number; updatedAt: string }
const DELIVERY_STATE: Record<string, string> = { PENDING: "En attente", SENDING: "En cours d'envoi", SENT: "Acceptée par le serveur email", RETRY: "Nouvelle tentative programmée", CANCELLED: "Annulée (consentement ou accès)", FAILED: "Échec de livraison", UNKNOWN: "Résultat indéterminé — vérification opérateur requise" };

const SECTOR_LABEL = new Map(SECTORS.map((s) => [s.code, s.label]));

/** Alertes enregistrées. Le consentement est visible, daté et révocable ligne par ligne. */
export default async function AlertsPage() {
  const { token } = await requireRole("INVESTOR", "INVESTOR_DIASPORA", "BANK", "ADVISOR");
  let items: Alert[] = [];
  let deliveries: Delivery[] = [];
  let error: string | null = null;
  try {
    const result = await api<{ items: Alert[]; deliveries: Delivery[] }>("/alerts", { token });
    items = result.items; deliveries = result.deliveries;
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
      {deliveries.length ? <Panel title="Historique des notifications" controlId="INV_ALERT_DELIVERIES">
        <p>Critères publics T0 uniquement. Une acceptation SMTP ne confirme pas la remise au destinataire.</p>
        <ul className="dp-stack">{deliveries.map((d) => <li key={d.id}>
          <strong>{DELIVERY_STATE[d.state] ?? d.state}</strong> · {fmtDate(d.updatedAt)} · Score : {d.score}/100 · Tentatives : {d.attempts}
          <ul>{d.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </li>)}</ul>
      </Panel> : null}

      {items.length > 0 ? (
        <Panel title="Alertes" controlId="INV_ALERTS">
          <div className="dp-tablewrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th scope="col">Nom</th>
                  <th scope="col">Critères</th>
                  <th scope="col">Créée le</th>
                  <th scope="col">Notification</th>
                  <th scope="col"></th>
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
