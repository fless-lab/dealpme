import { StateBanner, StatusBadge } from "@dealpme/ui";
import { api, ApiError } from "../../../../lib/api";
import { fmtDate, requireRole } from "../../../../lib/guards";
import { ConfirmMembership } from "./confirm-membership";

export const metadata = { title: "Adhésions", description: "Confirmation d'adhésion par référence CCI-Togo." };

interface OrganisationRow {
  id: string;
  name: string;
  attributionChannel: string;
  confirmationRef: string | null;
  createdAt: string;
  companies: number;
  confirmedAt: string | null;
}

const CHANNEL: Record<string, string> = {
  SELF_REGISTRATION: "Inscription directe",
  CCI_CAMPAIGN: "Campagne CCI-Togo",
  INSTITUTION: "Institution",
  PARTNER: "Partenaire",
  EVENT: "Événement",
};

/**
 * Adhésions : l'officier confirme qu'une organisation est membre en saisissant la référence fournie par la CCI-Togo.
 * La base des membres n'est jamais importée : seule la référence de confirmation est stockée (DP-CCI).
 */
export default async function MembershipsPage() {
  const { token } = await requireRole("CCI_OFFICER");
  let items: OrganisationRow[] = [];
  let error: string | null = null;
  try {
    items = (await api<{ items: OrganisationRow[] }>("/institution/organisations", { token })).items;
  } catch (e) {
    error = e instanceof ApiError ? e.envelope.message : "Service indisponible";
  }
  return (
    <div className="dp-stack">
      <div>
        <h1>Adhésions</h1>
        <p className="dp-muted">
          La confirmation d'adhésion enregistre la référence transmise par la CCI-Togo et l'officier qui l'a saisie.
          Aucun fichier de membres n'est importé dans la plateforme.
        </p>
      </div>
      {error ? <StateBanner tone="warning" title="Liste indisponible" controlId="CCI_MEMBERSHIPS_ERROR">{error}</StateBanner> : null}
      {!error && items.length === 0 ? <StateBanner tone="info" title="Aucune organisation inscrite" controlId="CCI_MEMBERSHIPS_EMPTY" /> : null}
      {items.length > 0 ? (
        <div className="dp-tablewrap">
          <table className="dp-table">
            <thead>
              <tr>
                <th scope="col">Organisation</th>
                <th scope="col">Origine</th>
                <th scope="col">Inscrite le</th>
                <th scope="col" className="dp-num">Entreprises</th>
                <th scope="col">Adhésion</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} data-control-id="CCI_MEMBERSHIP_ROW">
                  <td>{o.name}</td>
                  <td>{CHANNEL[o.attributionChannel] ?? o.attributionChannel}</td>
                  <td>{fmtDate(o.createdAt)}</td>
                  <td className="dp-num">{o.companies}</td>
                  <td>
                    {o.confirmedAt ? (
                      <>
                        <StatusBadge status="verified" label="Confirmée" controlId="CCI_MEMBERSHIP_CONFIRMED" />
                        <div className="dp-muted" style={{ fontSize: "0.78rem" }}>
                          {o.confirmationRef ?? "référence enregistrée"} le {fmtDate(o.confirmedAt)}
                        </div>
                      </>
                    ) : (
                      <StatusBadge status="pending" label="À confirmer" controlId="CCI_MEMBERSHIP_PENDING" />
                    )}
                  </td>
                  <td>
                    <ConfirmMembership organisationId={o.id} organisationName={o.name} alreadyConfirmed={!!o.confirmedAt} />
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
