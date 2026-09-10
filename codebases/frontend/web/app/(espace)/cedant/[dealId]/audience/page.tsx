import { Metric, Metrics, Panel, StateBanner } from "@dealpme/ui";
import { api } from "../../../../../lib/api";
import { fmtDateTime, requireRole } from "../../../../../lib/guards";
import { PublishDeal } from "./publish-deal";
import { SellerThread } from "./seller-thread";

interface Interest {
  id: string;
  message: string | null;
  createdAt: string;
}

interface DashRow {
  id: string;
  status: string;
  views: number;
  viewers: number;
  interests: number;
  messages: number;
}

/** Audience d'un dossier : consultations, intérêts reçus, échange avec les repreneurs, publication. */
export default async function AudiencePage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const { token } = await requireRole("SELLER", "ADVISOR");
  const dash = (await api<{ items: DashRow[] }>("/seller/dashboard", { token })).items.find((d) => d.id === dealId);
  const deal = await api<{ status: string; dealType: string }>(`/deals/${dealId}`, { token });
  let interests: Interest[] = [];
  try {
    interests = (await api<{ items: Interest[] }>(`/deals/${dealId}/interests`, { token })).items;
  } catch {
    interests = [];
  }

  return (
    <div className="dp-stack">
      <div>
        <h1>Audience</h1>
        <p className="dp-muted">
          Qui regarde ce dossier et qui s'est manifesté. L'identité des repreneurs reste fermée tant que vous ne les
          avez pas qualifiés et qu'un accord de confidentialité n'a pas été signé.
        </p>
      </div>

      <Metrics>
        <Metric label="Consultations" value={String(dash?.views ?? 0)} note={`${dash?.viewers ?? 0} organisation(s) identifiée(s)`} />
        <Metric label="Intérêts reçus" value={String(dash?.interests ?? 0)} />
        <Metric label="Messages" value={String(dash?.messages ?? 0)} />
      </Metrics>

      <PublishDeal dealId={dealId} status={deal.status} dealType={deal.dealType} />

      <Panel title="Manifestations d'intérêt" controlId="SELLER_INTERESTS">
        {interests.length === 0 ? (
          <StateBanner tone="info" title="Aucune manifestation d'intérêt pour le moment" controlId="SELLER_INTERESTS_EMPTY">
            Un dossier publié devient visible au palier T0. Les repreneurs se manifestent depuis la place de marché.
          </StateBanner>
        ) : (
          <div className="dp-tablewrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>Reçue le</th>
                  <th>Message d'accompagnement</th>
                </tr>
              </thead>
              <tbody>
                {interests.map((i) => (
                  <tr key={i.id} data-control-id="SELLER_INTEREST_ROW">
                    <td>{fmtDateTime(i.createdAt)}</td>
                    <td>{i.message ?? "Sans message"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="dp-muted" style={{ marginBottom: 0, fontSize: "0.82rem" }}>
          L'identité des repreneurs n'apparaît pas ici : elle s'ouvrira à la qualification, puis après signature de
          l'accord de confidentialité.
        </p>
      </Panel>

      <SellerThread dealId={dealId} />
    </div>
  );
}
