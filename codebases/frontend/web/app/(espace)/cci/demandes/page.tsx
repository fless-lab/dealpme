import { Panel, StateBanner, StatusBadge } from "@dealpme/ui";
import { api, ApiError } from "../../../../lib/api";
import { fmtDateTime, requireRole } from "../../../../lib/guards";
import { Remediation } from "./remediation";

interface Criterion {
  key: string;
  label: string;
  state: "SATISFIED" | "MISSING";
  blocking: boolean;
}

interface RequestRow {
  id: string;
  companyId: string;
  companyName: string;
  state: string;
  message: string | null;
  remediationItems: { label: string; detail: string | null }[];
  requestedAt: string;
  closedAt: string | null;
  checklist: { criteria: Criterion[]; requestable: boolean; missingBlocking: number } | null;
}

const STATE_LABEL: Record<string, string> = {
  REQUESTED: "À instruire",
  REMEDIATION_REQUIRED: "Compléments demandés",
  DECIDED: "Décidée",
  WITHDRAWN: "Retirée par l'entreprise",
};

/** File d'instruction des demandes Deal-Ready. La décision se prend depuis la fiche de l'entreprise. */
export default async function RequestsPage() {
  const { token } = await requireRole("CCI_OFFICER");
  let items: RequestRow[] = [];
  let error: string | null = null;
  try {
    items = (await api<{ items: RequestRow[] }>("/institution/certification-requests", { token })).items;
  } catch (e) {
    error = e instanceof ApiError ? e.envelope.message : "Service indisponible";
  }
  const open = items.filter((r) => r.state === "REQUESTED" || r.state === "REMEDIATION_REQUIRED");
  const closed = items.filter((r) => !open.includes(r));

  return (
    <div className="dp-stack">
      <div>
        <h1>Demandes de certification</h1>
        <p className="dp-muted">
          Chaque demande porte la liste de contrôle de l'entreprise au moment de l'instruction. Vous pouvez demander des
          compléments nommés, puis décider depuis la fiche de l'entreprise. Aucune décision n'est automatique.
        </p>
      </div>
      {error ? <StateBanner tone="warning" title="File indisponible" controlId="CCI_REQUESTS_ERROR">{error}</StateBanner> : null}
      {!error && items.length === 0 ? <StateBanner tone="info" title="Aucune demande déposée" controlId="CCI_REQUESTS_EMPTY" /> : null}

      {open.map((r) => (
        <Panel key={r.id} title={r.companyName} controlId="CCI_REQUEST_CARD">
          <div className="dp-actions" style={{ alignItems: "center", marginBottom: 12 }}>
            <StatusBadge status={r.state === "REQUESTED" ? "pending" : "restricted"} label={STATE_LABEL[r.state] ?? r.state} />
            <span className="dp-muted">déposée le {fmtDateTime(r.requestedAt)}</span>
            <a className="dp-btn dp-btn-secondary" href={`/cci/entreprises/${r.companyId}`} data-control-id="CCI_REQUEST_OPEN_COMPANY">
              Ouvrir la fiche et décider
            </a>
          </div>
          {r.message ? (
            <p style={{ marginTop: 0 }}>
              <span className="dp-label">Mot du cédant</span>
              <br />
              {r.message}
            </p>
          ) : null}
          {r.checklist ? (
            <>
              <p className="dp-label">Liste de contrôle</p>
              <div className="dp-actions" style={{ gap: 8 }}>
                {r.checklist.criteria.map((c) => (
                  <StatusBadge key={c.key} status={c.state === "SATISFIED" ? "verified" : c.blocking ? "pending" : "restricted"} label={c.label} />
                ))}
              </div>
              {r.checklist.missingBlocking > 0 ? (
                <StateBanner tone="warning" title={`${r.checklist.missingBlocking} critère(s) bloquant(s) non satisfait(s)`} controlId="CCI_REQUEST_INCOMPLETE">
                  L'état de l'entreprise a changé depuis le dépôt : ces critères ne sont plus satisfaits.
                </StateBanner>
              ) : null}
            </>
          ) : null}
          {r.remediationItems.length > 0 ? (
            <>
              <p className="dp-label" style={{ marginTop: 16 }}>Compléments déjà demandés</p>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {r.remediationItems.map((i) => (
                  <li key={i.label}>
                    <b>{i.label}</b>
                    {i.detail ? <div className="dp-muted">{i.detail}</div> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <div style={{ marginTop: 16 }}>
            <Remediation requestId={r.id} existing={r.remediationItems} />
          </div>
        </Panel>
      ))}

      {closed.length > 0 ? (
        <Panel title="Demandes closes" controlId="CCI_REQUESTS_CLOSED">
          <div className="dp-tablewrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Issue</th>
                  <th>Déposée le</th>
                  <th>Close le</th>
                </tr>
              </thead>
              <tbody>
                {closed.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <a href={`/cci/entreprises/${r.companyId}`}>{r.companyName}</a>
                    </td>
                    <td>{STATE_LABEL[r.state] ?? r.state}</td>
                    <td>{fmtDateTime(r.requestedAt)}</td>
                    <td>{r.closedAt ? fmtDateTime(r.closedAt) : "-"}</td>
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
