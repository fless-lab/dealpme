import { StateBanner, StatusBadge } from "@dealpme/ui";
import { api, ApiError } from "../../../../lib/api";
import { fmtDate, requireRole } from "../../../../lib/guards";

export const metadata = { title: "Entreprises", description: "Données déclarées et vérifications au registre." };

interface CompanyRow {
  id: string;
  declared: { legalName: string; legalForm: string; rccmNumber: string | null };
  owner: { id: string; name: string };
  registry: { legalName: string; status: string; verifiedAt: string; mode: string } | null;
  certification: { isDealReady: boolean; decision: string | null; decidedAt: string | null };
  createdAt: string;
}

/** Instruction : la donnée déclarée et la donnée vérifiée restent côte à côte, jamais fusionnées (DP-CCI-005). */
export default async function CompaniesPage() {
  const { token } = await requireRole("CCI_OFFICER");
  let items: CompanyRow[] = [];
  let error: string | null = null;
  try {
    items = (await api<{ items: CompanyRow[] }>("/institution/companies", { token })).items;
  } catch (e) {
    error = e instanceof ApiError ? e.envelope.message : "Service indisponible";
  }
  const pending = items.filter((c) => !c.registry).length;
  return (
    <div className="dp-stack">
      <div>
        <h1>Entreprises</h1>
        <p className="dp-muted">
          Colonne de gauche : ce que le cédant a déclaré. Colonne de droite : ce qui a été vérifié au RCCM ou au CFE.
          Les deux ne sont jamais fusionnées.
        </p>
      </div>
      {error ? <StateBanner tone="warning" title="Liste indisponible" controlId="CCI_COMPANIES_ERROR">{error}</StateBanner> : null}
      {!error && items.length === 0 ? <StateBanner tone="info" title="Aucune entreprise enregistrée" controlId="CCI_COMPANIES_EMPTY" /> : null}
      {pending > 0 ? (
        <StateBanner tone="info" title={`${pending} entreprise(s) en attente de vérification`} controlId="CCI_COMPANIES_PENDING">
          La certification Deal-Ready exige une vérification RCCM ou CFE préalable.
        </StateBanner>
      ) : null}
      {items.length > 0 ? (
        <div className="dp-tablewrap">
          <table className="dp-table">
            <thead>
              <tr>
                <th scope="col">Déclaré par le cédant</th>
                <th scope="col">Organisation</th>
                <th scope="col">Vérifié au registre</th>
                <th scope="col">Deal-Ready</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} data-control-id="CCI_COMPANY_ROW">
                  <td>
                    <b>{c.declared.legalName}</b>
                    <div className="dp-muted" style={{ fontSize: "0.78rem" }}>
                      {c.declared.legalForm} {c.declared.rccmNumber ? `- RCCM ${c.declared.rccmNumber}` : "- RCCM non renseigné"}
                    </div>
                  </td>
                  <td>{c.owner.name}</td>
                  <td>
                    {c.registry ? (
                      <>
                        <StatusBadge status="verified" label={c.registry.status} controlId="CCI_COMPANY_REGISTRY_OK" />
                        <div className="dp-muted" style={{ fontSize: "0.78rem" }}>
                          {c.registry.legalName} le {fmtDate(c.registry.verifiedAt)} ({c.registry.mode === "manual" ? "consultation opérateur" : "API registre"})
                        </div>
                      </>
                    ) : (
                      <StatusBadge status="pending" label="Non vérifié" controlId="CCI_COMPANY_REGISTRY_PENDING" />
                    )}
                  </td>
                  <td>
                    {c.certification.isDealReady ? (
                      <StatusBadge status="verified" label="Accordée" controlId="CCI_COMPANY_CERT_GRANTED" />
                    ) : c.certification.decision === "REFUSED" ? (
                      <StatusBadge status="revoked" label="Refusée" controlId="CCI_COMPANY_CERT_REFUSED" />
                    ) : c.certification.decision === "REVOKED" ? (
                      <StatusBadge status="revoked" label="Retirée" controlId="CCI_COMPANY_CERT_REVOKED" />
                    ) : (
                      <StatusBadge status="neutral" label="Aucune décision" controlId="CCI_COMPANY_CERT_NONE" />
                    )}
                  </td>
                  <td>
                    <a className="dp-btn dp-btn-secondary" href={`/cci/entreprises/${c.id}`} data-control-id="CCI_COMPANY_OPEN">
                      Instruire
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
