import { Panel, StateBanner } from "@dealpme/ui";
import { api } from "../../../../../lib/api";
import { fmtDateTime, requireRole } from "../../../../../lib/guards";
import { SOURCE_LABEL, fmtXof, type DeclaredFact, type Dossier } from "../../../../../lib/dossier";

/**
 * Historique d'une valeur déclarée : toutes les versions, avec leur source et leur date.
 * Rien n'est écrasé côté serveur ; cet écran ne fait que le rendre visible.
 */
export default async function FactHistoryPage({ params, searchParams }: { params: Promise<{ dealId: string }>; searchParams: Promise<{ champ?: string }> }) {
  const { dealId } = await params;
  const { champ } = await searchParams;
  const { token } = await requireRole("SELLER", "ADVISOR");
  const dossier = await api<Dossier>(`/deals/${dealId}/dossier`, { token });
  const label = dossier.requirements.find((r) => r.key === champ)?.label ?? champ ?? "Valeur";

  let items: DeclaredFact[] = [];
  if (champ) {
    items = (await api<{ items: DeclaredFact[] }>(`/deals/${dealId}/dossier/facts/history?fieldKey=${encodeURIComponent(champ)}`, { token })).items;
  }

  return (
    <div className="dp-stack">
      <div>
        <h1>Historique : {label}</h1>
        <p className="dp-muted">De la version la plus récente à la première déclaration.</p>
      </div>
      <Panel title="Versions" controlId="SELLER_HISTORY">
        {items.length === 0 ? (
          <StateBanner tone="info" title="Aucune version enregistrée pour ce champ" controlId="SELLER_HISTORY_EMPTY" />
        ) : (
          <div className="dp-tablewrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th scope="col" className="dp-num">Version</th>
                  <th scope="col">Valeur</th>
                  <th scope="col">Exercice</th>
                  <th scope="col">Source</th>
                  <th scope="col">Justification</th>
                  <th scope="col">Enregistrée le</th>
                  <th scope="col">État</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f) => (
                  <tr key={f.id}>
                    <td className="dp-num">{f.version}</td>
                    <td>{f.valueAmountXof !== null ? fmtXof(f.valueAmountXof) : f.valueText}</td>
                    <td>{f.periodLabel ?? "-"}</td>
                    <td>{SOURCE_LABEL[f.source] ?? f.source}</td>
                    <td>{f.note ?? "-"}</td>
                    <td>{fmtDateTime(f.declaredAt)}</td>
                    <td>{(f as DeclaredFact & { supersededAt?: string | null }).supersededAt ? "Remplacée" : "En vigueur"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className="dp-actions">
        <a className="dp-btn dp-btn-secondary" href={`/cedant/${dealId}/finances`} data-control-id="SELLER_HISTORY_BACK">
          Revenir au dossier
        </a>
      </div>
    </div>
  );
}
