import { notFound } from "next/navigation";
import { ContextBar, CriteriaMatrix, DecisionGate, Panel, StateBanner, StatusBadge } from "@dealpme/ui";
import { api, ApiError } from "../../../../../lib/api";
import { fmtDate, fmtDateTime, requireRole } from "../../../../../lib/guards";
import { DealReadyScope } from "../../../../../components/deal-ready";
import { CertificationDecision } from "./certification-decision";
import { RegistryVerification } from "./registry-verification";
import { ReturnDossier } from "./return-dossier";

interface CompanyDetail {
  id: string;
  declared: { legalName: string; legalForm: string; rccmNumber: string | null; createdAt: string };
  owner: { id: string; name: string; membershipConfirmed: boolean; membershipConfirmedAt: string | null };
  registry: { legalName: string; legalForm: string; status: string; registeredAddress: string | null; officers: string[]; verifiedAt: string; mode: string; sourceRef: string } | null;
  registryMode: "api" | "manual";
  registryProvider: string;
  consultationHistory: { id: string; outcome: string; mode: string; provider: string; synthetic: boolean; stale: boolean; reason: string | null; createdAt: string; officerUserId: string; result: { sourceRef: string; legalName?: string; legalForm?: string; status?: string } | null }[];
  certification: { isDealReady: boolean; decision: string | null; scopeStatement: string | null; decidedAt: string | null; expiresAt: string | null };
  history: { id: string; decision: string; scopeStatement: string; decidedAt: string; expiresAt: string | null; revocationReason: string | null; officerEmail: string | null }[];
  deals: { id: string; dealType: string; status: string; sectorCode: string; createdAt: string }[];
}

const DEAL_STATUS: Record<string, string> = {
  DRAFT: "En préparation",
  PENDING_VERIFICATION: "Soumis à vérification",
  VERIFIED: "Vérifié",
  LISTED_OPEN: "Publié",
  LISTED_RESTRICTED: "Publié en cercle restreint",
  ENGAGED: "Mise en relation engagée",
  DUE_DILIGENCE: "Audit d'acquisition",
  NEGOTIATION: "Négociation",
  CLOSED_REPORTED: "Transmission déclarée",
  ABANDONED: "Abandonné",
};

const DECISION: Record<string, string> = { GRANTED: "Accordée", REFUSED: "Refusée", REVOKED: "Retirée", EXPIRED: "Expirée" };

/**
 * Instruction d'une entreprise : déclaré contre vérifié, puis décision de certification.
 * La décision est nominative et jamais automatique (DP-CCI-006) ; l'octroi exige une vérification registre préalable.
 */
export default async function CompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const { token, me } = await requireRole("CCI_OFFICER");
  let data: CompanyDetail;
  try {
    data = await api<CompanyDetail>(`/institution/companies/${companyId}`, { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const declaredVsRegistry = data.registry
    ? [
        { label: "Raison sociale", state: data.registry.legalName === data.declared.legalName ? ("ok" as const) : ("ko" as const), detail: data.registry.legalName === data.declared.legalName ? undefined : `Registre : ${data.registry.legalName}` },
        { label: "Forme juridique", state: data.registry.legalForm === data.declared.legalForm ? ("ok" as const) : ("ko" as const), detail: data.registry.legalForm === data.declared.legalForm ? undefined : `Registre : ${data.registry.legalForm}` },
        { label: "Situation au registre", state: data.registry.status === "ACTIVE" ? ("ok" as const) : ("ko" as const), detail: data.registry.status },
      ]
    : [];

  const gateState = data.certification.decision ? "decided" : data.registry ? "ready" : "blocked";
  const lastOfficer = data.history[0]?.officerEmail ?? null;

  return (
    <>
      <ContextBar crumbs={[{ label: "Console CCI-Togo", href: "/cci" }, { label: "Entreprises", href: "/cci/entreprises" }, { label: data.declared.legalName }]}>
        {data.certification.isDealReady ? <StatusBadge status="verified" label="Deal-Ready" controlId="CCI_DETAIL_BADGE" /> : null}
      </ContextBar>
      <div className="dp-stack">
        <div>
          <h1>{data.declared.legalName}</h1>
          <p className="dp-muted">
            Détenue par {data.owner.name}
            {data.owner.membershipConfirmed ? ` - adhésion confirmée le ${fmtDate(data.owner.membershipConfirmedAt)}` : " - adhésion non confirmée"}
          </p>
        </div>

        {!data.owner.membershipConfirmed ? (
          <StateBanner tone="info" title="Adhésion non confirmée" controlId="CCI_DETAIL_MEMBERSHIP">
            L'adhésion de cette organisation n'est pas encore enregistrée. La confirmation se fait depuis l'onglet Adhésions.
          </StateBanner>
        ) : null}

        <div className="dp-grid">
          <Panel title="Déclaré par le cédant" controlId="CCI_DETAIL_DECLARED">
            <dl className="dp-deflist">
              <dt className="dp-label">Raison sociale</dt>
              <dd>{data.declared.legalName}</dd>
              <dt className="dp-label">Forme juridique</dt>
              <dd>{data.declared.legalForm}</dd>
              <dt className="dp-label">Numéro RCCM</dt>
              <dd>{data.declared.rccmNumber ?? "Non renseigné"}</dd>
              <dt className="dp-label">Créée le</dt>
              <dd>{fmtDate(data.declared.createdAt)}</dd>
            </dl>
            <p className="dp-muted" style={{ fontSize: "0.78rem", marginBottom: 0 }}>Déclaré, non audité.</p>
          </Panel>

          <Panel title="Vérifié au registre (RCCM / CFE)" controlId="CCI_DETAIL_REGISTRY">
            {data.registry ? (
              <>
                <dl className="dp-deflist">
                  <dt className="dp-label">Raison sociale</dt>
                  <dd>{data.registry.legalName}</dd>
                  <dt className="dp-label">Forme juridique</dt>
                  <dd>{data.registry.legalForm}</dd>
                  <dt className="dp-label">Situation</dt>
                  <dd>{data.registry.status}</dd>
                  <dt className="dp-label">Siège</dt>
                  <dd>{data.registry.registeredAddress ?? "Non renseigné"}</dd>
                  <dt className="dp-label">Dirigeants</dt>
                  <dd>{data.registry.officers.length ? data.registry.officers.join(", ") : "Non renseignés"}</dd>
                  <dt className="dp-label">Vérifié le</dt>
                  <dd>{fmtDateTime(data.registry.verifiedAt)}</dd>
                  <dt className="dp-label">Source</dt>
                  <dd>
                    {data.registry.sourceRef} ({data.registry.mode === "manual" ? "consultation opérateur" : "API registre"})
                  </dd>
                </dl>
                {declaredVsRegistry.length ? <CriteriaMatrix rows={declaredVsRegistry} controlId="CCI_DETAIL_MATCH" /> : null}
              </>
            ) : (
              <>
                <StateBanner tone="warning" title="Aucune vérification enregistrée" controlId="CCI_DETAIL_REGISTRY_EMPTY">
                  {data.registryMode === "manual"
                    ? "Mode manuel : consultez le registre, puis reportez ici ce que vous avez lu. La source de la consultation est conservée."
                    : "Mode API : la vérification interroge directement le registre."}
                </StateBanner>
              </>
            )}
            <p>Mode courant : {data.registryMode === "manual" ? "instruction manuelle" : `API / ${data.registryProvider}`}.</p>
            {data.registryProvider === "mock" ? <StateBanner tone="warning" title="Données synthétiques">Une consultation du simulateur ne permet pas l'octroi de Deal-Ready.</StateBanner> : null}
            <RegistryVerification companyId={data.id} declaredName={data.declared.legalName} declaredForm={data.declared.legalForm} declaredRccm={data.declared.rccmNumber} manual={data.registryMode === "manual"} incidentId={data.consultationHistory[0]?.outcome === "UNAVAILABLE" ? data.consultationHistory[0].id : undefined} />
          </Panel>
        </div>

        <Panel title="Historique des consultations RCCM / CFE" controlId="CCI_REGISTRY_HISTORY">
          {data.consultationHistory.length ? <ol className="dp-stack">{data.consultationHistory.map((c) => <li key={c.id}>
            <strong>{({ CONFIRMED: "Correspondance confirmée", NOT_FOUND: "Inscription introuvable", DIVERGENT: "Divergence", STRUCK_OFF: "Radiée", SUSPENDED: "Suspendue", INCOMPLETE: "Résultat incomplet", UNAVAILABLE: "Incident — à vérifier", NEEDS_INFO: "Complément demandé", REFUSED: "Refus" } as Record<string, string>)[c.outcome] ?? c.outcome}</strong>
            {c.synthetic ? " — SYNTHÉTIQUE" : ""}{c.stale ? " — identité modifiée, preuve obsolète" : ""}
            <div>{fmtDateTime(c.createdAt)} · {c.mode} / {c.provider} · Officier : {c.officerUserId}</div>
            {c.result ? <div>{c.result.legalName ?? "Nom absent"} · {c.result.legalForm ?? "Forme absente"} · {c.result.status ?? "Situation absente"} · Source : {c.result.sourceRef}</div> : null}
            {c.reason ? <div>Motif : {c.reason}</div> : null}
          </li>)}</ol> : <p>Aucune consultation dans le nouveau journal. Les vérifications historiques restent conservées.</p>}
        </Panel>

        <DecisionGate
          kind="certification"
          title="Certification Deal-Ready"
          state={gateState}
          decidedBy={gateState === "decided" ? lastOfficer : null}
          decidedAt={gateState === "decided" ? fmtDateTime(data.certification.decidedAt) : null}
          controlId="CCI_DETAIL_GATE"
        >
          {gateState === "blocked" ? (
            <StateBanner tone="warning" title="Certification indisponible" controlId="CCI_DETAIL_GATE_BLOCKED">
              L'octroi exige une vérification RCCM ou CFE préalable. Effectuez la vérification ci-dessus.
            </StateBanner>
          ) : null}
          {data.certification.decision ? (
            <div className="dp-stack">
              <div>
                <StatusBadge status={data.certification.isDealReady ? "verified" : "revoked"} label={DECISION[data.certification.decision] ?? data.certification.decision} controlId="CCI_DETAIL_DECISION" />
                {data.certification.expiresAt ? <span className="dp-muted" style={{ marginLeft: 8 }}>Expire le {fmtDate(data.certification.expiresAt)}</span> : null}
              </div>
              <DealReadyScope scopeStatement={data.certification.scopeStatement} />
            </div>
          ) : null}
          {data.registry ? <CertificationDecision companyId={data.id} officerEmail={me.email} hasDecision={!!data.certification.decision} isDealReady={data.certification.isDealReady} /> : null}
        </DecisionGate>

        <Panel title="Dossiers de transmission" controlId="CCI_DETAIL_DEALS">
          {data.deals.length === 0 ? (
            <StateBanner tone="info" title="Aucun dossier ouvert pour cette entreprise" controlId="CCI_DETAIL_DEALS_EMPTY" />
          ) : (
            <div className="dp-tablewrap">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Secteur</th>
                    <th scope="col">État</th>
                    <th scope="col">Ouvert le</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.deals.map((d) => (
                    <tr key={d.id} data-control-id="CCI_DETAIL_DEAL_ROW">
                      <td>{d.dealType === "ASSET_DEAL" ? "Cession d'actifs" : "Cession de titres"}</td>
                      <td>{d.sectorCode}</td>
                      <td>
                        <StatusBadge status={d.status === "PENDING_VERIFICATION" ? "pending" : d.status === "DRAFT" ? "neutral" : "verified"} label={DEAL_STATUS[d.status] ?? d.status} />
                      </td>
                      <td>{fmtDate(d.createdAt)}</td>
                      <td>{d.status === "PENDING_VERIFICATION" ? <ReturnDossier dealId={d.id} /> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="dp-muted" style={{ marginBottom: 0, fontSize: "0.82rem" }}>
            La console donne l'état des dossiers, jamais leur contenu confidentiel. L'instruction des pièces se fait
            depuis le dossier lui-même, avec la trace de qui a lu quoi.
          </p>
        </Panel>

        <Panel title="Historique des décisions" controlId="CCI_DETAIL_HISTORY">
          {data.history.length === 0 ? (
            <StateBanner tone="info" title="Aucune décision enregistrée pour cette entreprise" controlId="CCI_DETAIL_HISTORY_EMPTY" />
          ) : (
            <div className="dp-tablewrap">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th scope="col">Décision</th>
                    <th scope="col">Officier</th>
                    <th scope="col">Date</th>
                    <th scope="col">Portée déclarée</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((h) => (
                    <tr key={h.id}>
                      <td>{DECISION[h.decision] ?? h.decision}</td>
                      <td>{h.officerEmail ?? "Officier retiré"}</td>
                      <td>{fmtDateTime(h.decidedAt)}</td>
                      <td>
                        {h.scopeStatement}
                        {h.revocationReason ? <div className="dp-muted">Motif du retrait : {h.revocationReason}</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
