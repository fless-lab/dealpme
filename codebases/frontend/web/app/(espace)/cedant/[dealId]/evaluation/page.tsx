import { Panel, StateBanner } from "@dealpme/ui";
import { api } from "../../../../../lib/api";
import { fmtDateTime, requireRole } from "../../../../../lib/guards";
import { fmtXof } from "../../../../../lib/dossier";
import { ValuationForm } from "./valuation-form";

interface History {
  declared: { ebitdaXof: number | null; netDebtXof: number | null; periodLabel: string | null };
  multiples: { low: number; high: number; source: string; asOf: string };
  items: {
    id: string;
    method: string;
    equityLowXof: number | null;
    equityHighXof: number | null;
    calculationLog: Record<string, unknown>;
    sources: string[];
    computedAt: string;
  }[];
}

/**
 * Évaluation indicative (P05). La fourchette est un ordre de grandeur calculé à partir de valeurs déclarées :
 * ce n'est ni un avis de DealPME, ni une valorisation opposable. La mention l'accompagne partout et ne se masque pas.
 */
export default async function ValuationPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const { token } = await requireRole("SELLER", "ADVISOR");
  const history = await api<History>(`/valuations/${dealId}`, { token });
  const latest = history.items[0];

  return (
    <div className="dp-stack">
      <div>
        <h1>Évaluation indicative</h1>
        <p className="dp-muted" style={{ maxWidth: "70ch" }}>
          Un ordre de grandeur, calculé à partir de vos chiffres déclarés et d'une grille de multiples sectoriels
          datée. DealPME ne valorise pas votre entreprise et n'émet aucun avis : le calcul est affiché en entier pour
          que vous puissiez le contester.
        </p>
      </div>

      <ValuationForm
        dealId={dealId}
        declared={history.declared}
        multiples={history.multiples}
      />

      {latest ? (
        <Panel title="Dernière fourchette calculée" controlId="SELLER_VAL_LATEST">
          <p style={{ fontSize: "1.4rem", margin: "0 0 4px" }}>
            {fmtXof(latest.equityLowXof)} à {fmtXof(latest.equityHighXof)}
          </p>
          <p className="dp-muted" style={{ marginTop: 0 }}>
            Valeur des capitaux propres, méthode {latest.method === "EBITDA_MULTIPLE" ? "des multiples d'excédent brut d'exploitation" : latest.method}, calculée le {fmtDateTime(latest.computedAt)}.
          </p>
          <div className="dp-tablewrap">
            <table className="dp-table">
              <tbody>
                {Object.entries(latest.calculationLog).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ width: "45%" }}>{LOG_LABEL[k] ?? k}</td>
                    <td className="dp-num">{typeof v === "number" && Math.abs(v) > 1000 ? fmtXof(v) : String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="dp-label" style={{ marginTop: 16 }}>Sources</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {latest.sources.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <div style={{ height: 12 }} />
          <StateBanner tone="warning" title="Indicative et non opposable" controlId="SELLER_VAL_DISCLAIMER">
            Cette fourchette n'engage ni DealPME, ni la CCI-Togo. Elle repose sur des chiffres que vous avez déclarés
            et qui ne sont pas audités. Le prix d'une transmission se négocie ; il dépend d'éléments que ce calcul
            ignore, à commencer par la dépendance au dirigeant et la concentration des clients.
          </StateBanner>
        </Panel>
      ) : null}

      {history.items.length > 1 ? (
        <Panel title="Calculs précédents" controlId="SELLER_VAL_HISTORY">
          <div className="dp-tablewrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th scope="col">Calculée le</th>
                  <th scope="col">Fourchette</th>
                  <th scope="col">Méthode</th>
                </tr>
              </thead>
              <tbody>
                {history.items.slice(1).map((v) => (
                  <tr key={v.id}>
                    <td>{fmtDateTime(v.computedAt)}</td>
                    <td>
                      {fmtXof(v.equityLowXof)} à {fmtXof(v.equityHighXof)}
                    </td>
                    <td>{v.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="dp-muted" style={{ marginBottom: 0, fontSize: "0.82rem" }}>
            Chaque calcul est conservé avec son journal : il peut être rejoué à l'identique.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}

const LOG_LABEL: Record<string, string> = {
  ebitdaDeclared: "Excédent brut d'exploitation déclaré",
  restatementsTotal: "Total des retraitements",
  adjustedEbitda: "Excédent brut retraité",
  multipleLow: "Multiple bas",
  multipleHigh: "Multiple haut",
  enterpriseValueLow: "Valeur d'entreprise basse",
  enterpriseValueHigh: "Valeur d'entreprise haute",
  netDebt: "Dette nette déduite",
  equityLow: "Capitaux propres bas",
  equityHigh: "Capitaux propres hauts",
};
