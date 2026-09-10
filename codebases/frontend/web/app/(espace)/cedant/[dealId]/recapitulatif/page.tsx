import { CoverageRow, Panel, StateBanner, StatusBadge } from "@dealpme/ui";
import { api } from "../../../../../lib/api";
import { fmtDateTime, requireRole } from "../../../../../lib/guards";
import { SOURCE_LABEL, STEPS, fmtSize, fmtXof, type Dossier } from "../../../../../lib/dossier";
import { SubmitDossier } from "./submit-dossier";

/**
 * Récapitulatif : ce que la CCI-Togo va lire. Chaque valeur porte sa source et sa version ;
 * la mention "déclaré, non audité" accompagne le tableau, elle n'est pas masquable.
 */
export default async function SummaryPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const { token } = await requireRole("SELLER", "ADVISOR");
  const dossier = await api<Dossier>(`/deals/${dealId}/dossier`, { token });
  const labelOf = new Map(dossier.requirements.map((r) => [r.kind === "fact" ? r.key : r.category, r.label]));

  return (
    <div className="dp-stack">
      <div>
        <h1>Récapitulatif</h1>
        <p className="dp-muted">Ce que verra la CCI-Togo au moment d'instruire le dossier.</p>
      </div>

      <Panel title="Complétude" controlId="SELLER_SUMMARY_COVERAGE">
        {STEPS.map((s) => {
          const total = dossier.requirements.filter((r) => r.step === s.id).length;
          const missing = dossier.completeness.missing.filter((m) => m.step === s.id).length;
          if (total === 0) return null;
          return <CoverageRow key={s.id} domain={s.label} ratio={(total - missing) / total} gaps={missing} />;
        })}
        {dossier.completeness.complete ? (
          <StateBanner tone="success" title="Dossier complet" controlId="SELLER_SUMMARY_COMPLETE">
            Tous les éléments attendus sont présents. Vous pouvez soumettre le dossier à la CCI-Togo.
          </StateBanner>
        ) : (
          <StateBanner tone="warning" title={`${dossier.completeness.missing.length} élément(s) manquant(s)`} controlId="SELLER_SUMMARY_MISSING">
            <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
              {dossier.completeness.missing.map((m) => (
                <li key={`${m.kind}-${m.key}`}>{m.label}</li>
              ))}
            </ul>
          </StateBanner>
        )}
      </Panel>

      <Panel title="Informations déclarées" controlId="SELLER_SUMMARY_FACTS">
        {dossier.facts.length === 0 ? (
          <StateBanner tone="info" title="Aucune information renseignée pour le moment" controlId="SELLER_SUMMARY_FACTS_EMPTY" />
        ) : (
          <div className="dp-tablewrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>Information</th>
                  <th>Valeur</th>
                  <th>Exercice</th>
                  <th>Source</th>
                  <th>Version</th>
                  <th>Enregistrée le</th>
                </tr>
              </thead>
              <tbody>
                {dossier.facts.map((f) => (
                  <tr key={f.id}>
                    <td>{labelOf.get(f.fieldKey) ?? f.fieldKey}</td>
                    <td>{f.valueAmountXof !== null ? fmtXof(f.valueAmountXof) : f.valueText}</td>
                    <td>{f.periodLabel ?? "-"}</td>
                    <td>
                      {SOURCE_LABEL[f.source] ?? f.source}
                      {f.note ? <div className="dp-muted" style={{ fontSize: "0.78rem" }}>{f.note}</div> : null}
                    </td>
                    <td className="dp-num">{f.version}</td>
                    <td>{fmtDateTime(f.declaredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="dp-muted" style={{ marginBottom: 0 }}>
          Déclaré, non audité. Ces informations viennent du cédant : DealPME ne les audite pas et ne les certifie pas.
          La CCI-Togo vérifie l'existence juridique et la complétude documentaire, jamais l'exactitude des chiffres.
        </p>
      </Panel>

      <Panel title="Pièces déposées" controlId="SELLER_SUMMARY_DOCS">
        {dossier.documents.length === 0 ? (
          <StateBanner tone="info" title="Aucune pièce déposée pour le moment" controlId="SELLER_SUMMARY_DOCS_EMPTY" />
        ) : (
          <div className="dp-tablewrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>Pièce</th>
                  <th>Fichier</th>
                  <th>Taille</th>
                  <th>Analyse</th>
                  <th>Version</th>
                  <th>Déposée le</th>
                </tr>
              </thead>
              <tbody>
                {dossier.documents.map((d) => (
                  <tr key={d.id}>
                    <td>{labelOf.get(d.category) ?? d.category}</td>
                    <td>
                      <a href={`/api/dossier/${dealId}/documents/${d.id}/content`} target="_blank" rel="noreferrer" data-control-id="SELLER_SUMMARY_DOC_OPEN">
                        {d.fileName}
                      </a>
                    </td>
                    <td>{fmtSize(d.sizeBytes)}</td>
                    <td>
                      <StatusBadge status="verified" label="Analysée" />
                    </td>
                    <td className="dp-num">{d.version}</td>
                    <td>{fmtDateTime(d.uploadedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <SubmitDossier dealId={dealId} complete={dossier.completeness.complete} status={dossier.status} />
    </div>
  );
}
