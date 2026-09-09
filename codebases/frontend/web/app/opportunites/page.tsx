import type { DealTeaserT0 } from "@dealpme/contracts";
import { StateBanner } from "@dealpme/ui";
import { api, ApiError } from "../../lib/api";

/**
 * Liste des opportunités : uniquement des champs T0 (la projection est faite par le serveur).
 * États vide / erreur présents dès le premier écran (definition of done).
 */
export default async function OpportunitiesPage() {
  let items: DealTeaserT0[] = [];
  let error: string | null = null;
  try {
    const page = await api<{ items: DealTeaserT0[]; nextCursor: string | null }>("/opportunities?limit=20");
    items = page.items;
  } catch (e) {
    error = e instanceof ApiError ? `${e.envelope.code} : ${e.envelope.message}` : "API indisponible";
  }
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Opportunités</h1>
      {error ? <StateBanner tone="warning" title="Impossible de charger les opportunités" controlId="OPP_LIST_ERROR">{error}</StateBanner> : null}
      {!error && items.length === 0 ? <StateBanner tone="info" title="Aucune opportunité publiée pour le moment" controlId="OPP_LIST_EMPTY" /> : null}
      <div className="dp-grid">
        {items.map((d) => (
          <article key={d.id} className="dp-card" data-control-id="OPP_CARD">
            <p className="dp-label">{d.dealType === "ASSET_DEAL" ? "Cession d'actifs" : "Cession de titres"}</p>
            <h3>{d.sectorCode}</h3>
            <p style={{ margin: "0.3rem 0", color: "var(--dp-acier)" }}>{d.regionCode} · {d.turnoverBand}</p>
            {d.isDealReady ? <span style={{ color: "var(--dp-verifie)", fontWeight: 600 }}>Deal-Ready CCI-Togo</span> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
