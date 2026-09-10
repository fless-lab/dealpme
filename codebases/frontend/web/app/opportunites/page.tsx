import type { DealTeaserT0 } from "@dealpme/contracts";
import { DealRow, Panel, StateBanner } from "@dealpme/ui";
import { DealReadyScope } from "../../components/deal-ready";
import { api, ApiError } from "../../lib/api";
import { getSession } from "../../lib/session";

const BAND: Record<string, string> = { LT_50M: "moins de 50 M FCFA", FROM_50M_TO_250M: "50 à 250 M FCFA", FROM_250M_TO_1B: "250 M à 1 Md FCFA", GT_1B: "plus de 1 Md FCFA" };
const REGION: Record<string, string> = { GRAND_LOME: "Grand Lomé", MARITIME: "Maritime", PLATEAUX: "Plateaux", CENTRALE: "Centrale", KARA: "Kara", SAVANES: "Savanes" };

/** Liste des opportunités : champs T0 uniquement, projetés par le serveur. États vide et erreur dès le premier écran. */
export default async function OpportunitiesPage() {
  const session = await getSession();
  let items: DealTeaserT0[] = [];
  let error: string | null = null;
  try {
    items = (await api<{ items: DealTeaserT0[]; nextCursor: string | null }>("/opportunities?limit=20", { token: session?.token ?? null })).items;
  } catch (e) {
    error = e instanceof ApiError ? `${e.envelope.code} : ${e.envelope.message}` : "API indisponible";
  }
  return (
    <div className="dp-stack">
      <div>
        <h1>Opportunités</h1>
        <p className="dp-muted">Palier T0 : secteur, région et tranche de chiffre d'affaires. L'identité et le prix ne sont jamais affichés ici.</p>
      </div>
      {error ? <StateBanner tone="warning" title="Impossible de charger les opportunités" controlId="OPP_LIST_ERROR">{error}</StateBanner> : null}
      {!error && items.length === 0 ? <StateBanner tone="info" title="Aucune opportunité publiée pour le moment" controlId="OPP_LIST_EMPTY" /> : null}
      <div style={{ border: items.length ? "1px solid var(--dp-line)" : "none", borderRadius: 8, overflow: "hidden" }}>
        {items.map((d) => (
          <DealRow
            key={d.id}
            href={`/opportunites/${d.id}`}
            title={d.sectorCode}
            sector={d.sectorCode}
            region={REGION[d.regionCode] ?? d.regionCode}
            band={BAND[d.turnoverBand] ?? d.turnoverBand}
            dealTypeLabel={d.dealType === "ASSET_DEAL" ? "Cession d'actifs" : "Cession de titres"}
            dealReady={d.isDealReady}
            tier="T0"
          />
        ))}
      </div>
      {items.some((d) => d.isDealReady) ? (
        <Panel title="Ce que signifie le badge Deal-Ready" controlId="OPP_LIST_DEAL_READY_SCOPE">
          <DealReadyScope />
        </Panel>
      ) : null}
    </div>
  );
}
