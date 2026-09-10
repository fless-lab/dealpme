import type { DealTeaserT0 } from "@dealpme/contracts";
import { DealRow, Panel, StateBanner } from "@dealpme/ui";
import { DealReadyScope } from "../../components/deal-ready";
import { api, ApiError } from "../../lib/api";
import { getSession } from "../../lib/session";
import { BAND_LABEL, REGION_LABEL, SECTORS } from "../../lib/dossier";
import { Filters } from "./filters";
import { SaveAlert } from "./save-alert";

const SECTOR_LABEL = new Map(SECTORS.map((s) => [s.code, s.label]));

/**
 * Place de marché, palier T0. Secteur, région et tranche de chiffre d'affaires : rien d'autre n'est
 * sérialisé par le serveur. Les filtres portent sur ces mêmes champs, jamais sur un champ restreint.
 */
export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const session = await getSession();
  const query = new URLSearchParams({ limit: "20" });
  for (const key of ["sectorCode", "regionCode", "turnoverBand"] as const) {
    const value = sp[key];
    if (value) query.set(key, value);
  }
  if (sp["dealReadyOnly"] === "1") query.set("dealReadyOnly", "true");

  let items: DealTeaserT0[] = [];
  let error: string | null = null;
  try {
    items = (await api<{ items: DealTeaserT0[]; nextCursor: string | null }>(`/opportunities?${query.toString()}`, { token: session?.token ?? null })).items;
  } catch (e) {
    error = e instanceof ApiError ? `${e.envelope.code} : ${e.envelope.message}` : "API indisponible";
  }

  const filtered = ["sectorCode", "regionCode", "turnoverBand", "dealReadyOnly"].some((k) => sp[k]);
  const canSaveAlert = !!session && session.me.roles.some((r) => ["INVESTOR", "INVESTOR_DIASPORA", "BANK", "ADVISOR"].includes(r));

  return (
    <div className="dp-stack">
      <div>
        <h1>Opportunités</h1>
        <p className="dp-muted">
          Palier T0 : secteur, région et tranche de chiffre d'affaires. L'identité de l'entreprise, le prix et les
          conditions ne sont jamais affichés ici ; ils s'ouvrent après un accord de confidentialité.
        </p>
      </div>

      <Filters current={sp} />

      {error ? <StateBanner tone="warning" title="Impossible de charger les opportunités" controlId="OPP_LIST_ERROR">{error}</StateBanner> : null}
      {!error && items.length === 0 ? (
        <StateBanner tone="info" title={filtered ? "Aucune opportunité ne correspond à ces critères" : "Aucune opportunité publiée pour le moment"} controlId="OPP_LIST_EMPTY">
          {filtered ? "Élargissez la recherche, ou enregistrez une alerte pour être prévenu d'une nouvelle publication." : null}
        </StateBanner>
      ) : null}

      {items.length > 0 ? (
        <>
          <p className="dp-muted">{items.length} opportunité(s)</p>
          <div style={{ border: "1px solid var(--dp-line)", borderRadius: 8, overflow: "hidden" }}>
            {items.map((d) => (
              <DealRow
                key={d.id}
                href={`/opportunites/${d.id}`}
                title={SECTOR_LABEL.get(d.sectorCode) ?? d.sectorCode}
                sector={d.sectorCode}
                region={REGION_LABEL[d.regionCode] ?? d.regionCode}
                band={BAND_LABEL[d.turnoverBand] ?? d.turnoverBand}
                dealTypeLabel={d.dealType === "ASSET_DEAL" ? "Cession d'actifs" : "Cession de titres"}
                dealReady={d.isDealReady}
                tier="T0"
              />
            ))}
          </div>
        </>
      ) : null}

      {canSaveAlert ? <SaveAlert current={sp} /> : null}

      {items.some((d) => d.isDealReady) ? (
        <Panel title="Ce que signifie le badge Deal-Ready" controlId="OPP_LIST_DEAL_READY_SCOPE">
          <DealReadyScope />
        </Panel>
      ) : null}
    </div>
  );
}
