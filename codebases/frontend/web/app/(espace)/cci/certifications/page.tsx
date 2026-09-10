import { StateBanner, StatusBadge } from "@dealpme/ui";
import { api, ApiError } from "../../../../lib/api";
import { fmtDate, fmtDateTime, requireRole } from "../../../../lib/guards";

interface CertificationRow {
  id: string;
  companyId: string;
  companyName: string;
  decision: string;
  scopeStatement: string;
  decidedAt: string;
  expiresAt: string | null;
  revocationReason: string | null;
  officerEmail: string | null;
}

const DECISION: Record<string, string> = { GRANTED: "Accordée", REFUSED: "Refusée", REVOKED: "Retirée", EXPIRED: "Expirée" };

/** Journal d'audit des décisions de certification : chaque décision porte un officier nommé, un horodatage et sa portée. */
export default async function CertificationsJournalPage() {
  const { token } = await requireRole("CCI_OFFICER");
  let items: CertificationRow[] = [];
  let error: string | null = null;
  try {
    items = (await api<{ items: CertificationRow[] }>("/institution/certifications", { token })).items;
  } catch (e) {
    error = e instanceof ApiError ? e.envelope.message : "Service indisponible";
  }
  return (
    <div className="dp-stack">
      <div>
        <h1>Journal des certifications</h1>
        <p className="dp-muted">
          Toutes les décisions Deal-Ready, dans l'ordre chronologique inverse. Aucune décision n'est automatique :
          chaque ligne porte le nom de l'officier qui l'a prise.
        </p>
      </div>
      {error ? <StateBanner tone="warning" title="Journal indisponible" controlId="CCI_JOURNAL_ERROR">{error}</StateBanner> : null}
      {!error && items.length === 0 ? <StateBanner tone="info" title="Aucune décision enregistrée" controlId="CCI_JOURNAL_EMPTY" /> : null}
      {items.length > 0 ? (
        <>
          <div className="dp-actions">
            <a className="dp-btn dp-btn-secondary" href="/api/institution/certifications.csv" data-control-id="CCI_JOURNAL_EXPORT">
              Exporter en CSV
            </a>
          </div>
          <div className="dp-tablewrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Décision</th>
                  <th>Officier</th>
                  <th>Prise le</th>
                  <th>Expire le</th>
                  <th>Portée déclarée</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} data-control-id="CCI_JOURNAL_ROW">
                    <td>
                      <a href={`/cci/entreprises/${c.companyId}`}>{c.companyName}</a>
                    </td>
                    <td>
                      <StatusBadge status={c.decision === "GRANTED" ? "verified" : c.decision === "REFUSED" || c.decision === "REVOKED" ? "revoked" : "neutral"} label={DECISION[c.decision] ?? c.decision} />
                    </td>
                    <td>{c.officerEmail ?? "Officier retiré"}</td>
                    <td>{fmtDateTime(c.decidedAt)}</td>
                    <td>{c.expiresAt ? fmtDate(c.expiresAt) : "Sans terme"}</td>
                    <td style={{ maxWidth: "42ch" }}>
                      {c.scopeStatement}
                      {c.revocationReason ? <div className="dp-muted">Motif : {c.revocationReason}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
