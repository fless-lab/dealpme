import { notFound } from "next/navigation";
import { ContextBar, Metric, Metrics, Panel, PermissionLens, StateBanner, TransactionRail } from "@dealpme/ui";
import { api, ApiError } from "../../../lib/api";
import { getSession } from "../../../lib/session";
import { fmtDate } from "../../../lib/guards";
import { BAND_LABEL, REGION_LABEL, SECTORS } from "../../../lib/dossier";
import { TRANSACTION_STAGES } from "@dealpme/rules";
import { DealReadyBadge, DealReadyScope } from "../../../components/deal-ready";
import { ExpressInterest } from "./express-interest";

interface Teaser {
  id: string;
  dealType: "ASSET_DEAL" | "SHARE_DEAL";
  sectorCode: string;
  regionCode: string;
  turnoverBand: string;
  isDealReady: boolean;
  publishedAt: string | null;
}

const SECTOR_LABEL = new Map(SECTORS.map((s) => [s.code, s.label]));



/**
 * Fiche d'une opportunité au palier T0. Ce que l'écran ne montre pas est aussi important que ce qu'il montre :
 * la lentille de permission dit pourquoi l'identité et le prix restent fermés, et ce qui les ouvrira.
 */
export default async function OpportunityPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const session = await getSession();
  let deal: Teaser;
  try {
    deal = await api<Teaser>(`/opportunities/${dealId}`, { token: session?.token ?? null });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const isShare = deal.dealType === "SHARE_DEAL";
  const canExpressInterest = !!session && session.me.roles.some((r) => ["INVESTOR", "INVESTOR_DIASPORA", "ADVISOR", "BANK"].includes(r));
  // L'état d'intérêt vient du serveur : l'écran ne le devine pas à partir des messages échangés.
  let alreadyInterested = false;
  if (canExpressInterest && session) {
    try {
      const mine = await api<{ items: { dealId: string }[] }>("/interests", { token: session.token });
      alreadyInterested = mine.items.some((i) => i.dealId === deal.id);
    } catch {
      alreadyInterested = false;
    }
  }
  const sector = SECTOR_LABEL.get(deal.sectorCode) ?? deal.sectorCode;

  return (
    <>
      <ContextBar crumbs={[{ label: "Opportunités", href: "/opportunites" }, { label: sector }]}>
        <DealReadyBadge granted={deal.isDealReady} controlId="OPP_DETAIL_BADGE" />
      </ContextBar>
      <div className="dp-stack">
        <div>
          <p className="dp-label">{deal.dealType === "ASSET_DEAL" ? "Cession d'actifs" : "Cession de titres"}</p>
          <h1>{sector} en {REGION_LABEL[deal.regionCode] ?? deal.regionCode}</h1>
          <p className="dp-muted">Publiée le {fmtDate(deal.publishedAt)}. Identifiant du dossier : {deal.id.slice(0, 8)}.</p>
        </div>

        <Metrics>
          <Metric label="Secteur" value={sector} />
          <Metric label="Région" value={REGION_LABEL[deal.regionCode] ?? deal.regionCode} />
          <Metric label="Chiffre d'affaires" value={BAND_LABEL[deal.turnoverBand] ?? deal.turnoverBand} note="Tranche déclarée, jamais le montant exact" />
        </Metrics>

        <PermissionLens
          model={{
            tier: "T0",
            state: isShare ? "regulatory" : "denied",
            reason: isShare
              ? "Cession de titres : la diffusion au-delà d'un cercle restreint est interdite. Seuls des repreneurs admis un par un par le service de conformité accèdent au détail."
              : "Palier T0 : l'identité de l'entreprise, le prix demandé et les conditions ne sont pas communiqués à ce stade.",
            ...(isShare
              ? {}
              : {
                  nextAction: canExpressInterest
                    ? { label: "Manifester votre intérêt", href: `#interet`, controlId: "OPP_DETAIL_NEXT" }
                    : { label: "Créer un compte investisseur", href: "/inscription", controlId: "OPP_DETAIL_REGISTER" },
                }),
            missing: isShare ? ["Admission au cercle par le service de conformité"] : ["Manifestation d'intérêt", "Qualification par le cédant", "Accord de confidentialité signé"],
          }}
          controlId="OPP_DETAIL_LENS"
        />

        {isShare ? (
          <StateBanner tone="warning" title="Diffusion encadrée par la réglementation" controlId="OPP_DETAIL_SHARE_NOTICE">
            Proposer des titres au public sans y être autorisé expose l'opération à la nullité. La plateforme applique
            cette limite : ce dossier ne peut pas être diffusé plus largement, quelle que soit la demande.
          </StateBanner>
        ) : null}

        <Panel title="Parcours d'une transaction" controlId="OPP_DETAIL_RAIL">
          <TransactionRail stages={TRANSACTION_STAGES.map((s) => ({ id: s.id, label: s.label }))} current="INTERESTED" />
          <p className="dp-muted" style={{ marginBottom: 0 }}>
            Chaque étape ouvre un peu plus d'information, et seulement à ceux qui l'ont franchie. Rien ne s'ouvre
            automatiquement : le cédant qualifie, la conformité admet, l'accord de confidentialité se signe.
          </p>
        </Panel>

        <div id="interet">
          {canExpressInterest ? (
            <ExpressInterest dealId={deal.id} isShare={isShare} alreadyInterested={alreadyInterested} />
          ) : session ? (
            <StateBanner tone="info" title="Votre compte n'est pas un compte repreneur" controlId="OPP_DETAIL_ROLE">
              La manifestation d'intérêt est réservée aux investisseurs, aux banques et aux conseils.
            </StateBanner>
          ) : (
            <StateBanner tone="info" title="Connectez-vous pour manifester votre intérêt" controlId="OPP_DETAIL_ANON">
              <div className="dp-actions" style={{ marginTop: 8 }}>
                <a className="dp-btn dp-btn-primary" href="/inscription" data-control-id="OPP_DETAIL_REGISTER_CTA">
                  Créer un compte
                </a>
                <a className="dp-btn dp-btn-secondary" href="/connexion" data-control-id="OPP_DETAIL_LOGIN_CTA">
                  Se connecter
                </a>
              </div>
            </StateBanner>
          )}
        </div>

        {deal.isDealReady ? (
          <Panel title="Certification Deal-Ready" controlId="OPP_DETAIL_SCOPE">
            <DealReadyScope />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
