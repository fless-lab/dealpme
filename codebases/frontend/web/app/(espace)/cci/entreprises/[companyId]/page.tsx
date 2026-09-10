import { notFound } from "next/navigation";
import { ContextBar, CriteriaMatrix, DecisionGate, Panel, StateBanner, StatusBadge } from "@dealpme/ui";
import { api, ApiError } from "../../../../../lib/api";
import { fmtDate, fmtDateTime, requireRole } from "../../../../../lib/guards";
import { DealReadyScope } from "../../../../../components/deal-ready";
import { CertificationDecision } from "./certification-decision";
import { RegistryVerification } from "./registry-verification";

interface CompanyDetail {
  id: string;
  declared: { legalName: string; legalForm: string; rccmNumber: string | null; createdAt: string };
  owner: { id: string; name: string; membershipConfirmed: boolean; membershipConfirmedAt: string | null };
  registry: { legalName: string; legalForm: string; status: string; registeredAddress: string | null; officers: string[]; verifiedAt: string; mode: string; sourceRef: string } | null;
  registryMode: "api" | "manual";
  certification: { isDealReady: boolean; decision: string | null; scopeStatement: string | null; decidedAt: string | null; expiresAt: string | null };
  history: { id: string; decision: string; scopeStatement: string; decidedAt: string; expiresAt: string | null; revocationReason: string | null; officerEmail: string | null }[];
}

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
            <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 20px", margin: 0 }}>
              <dt className="dp-label">Raison sociale</dt>
              <dd style={{ margin: 0 }}>{data.declared.legalName}</dd>
              <dt className="dp-label">Forme juridique</dt>
              <dd style={{ margin: 0 }}>{data.declared.legalForm}</dd>
              <dt className="dp-label">Numéro RCCM</dt>
              <dd style={{ margin: 0 }}>{data.declared.rccmNumber ?? "Non renseigné"}</dd>
              <dt className="dp-label">Créée le</dt>
              <dd style={{ margin: 0 }}>{fmtDate(data.declared.createdAt)}</dd>
            </dl>
            <p className="dp-muted" style={{ fontSize: "0.78rem", marginBottom: 0 }}>Déclaré, non audité.</p>
          </Panel>

          <Panel title="Vérifié au registre (RCCM / CFE)" controlId="CCI_DETAIL_REGISTRY">
            {data.registry ? (
              <>
                <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 20px", margin: 0 }}>
                  <dt className="dp-label">Raison sociale</dt>
                  <dd style={{ margin: 0 }}>{data.registry.legalName}</dd>
                  <dt className="dp-label">Forme juridique</dt>
                  <dd style={{ margin: 0 }}>{data.registry.legalForm}</dd>
                  <dt className="dp-label">Situation</dt>
                  <dd style={{ margin: 0 }}>{data.registry.status}</dd>
                  <dt className="dp-label">Siège</dt>
                  <dd style={{ margin: 0 }}>{data.registry.registeredAddress ?? "Non renseigné"}</dd>
                  <dt className="dp-label">Dirigeants</dt>
                  <dd style={{ margin: 0 }}>{data.registry.officers.length ? data.registry.officers.join(", ") : "Non renseignés"}</dd>
                  <dt className="dp-label">Vérifié le</dt>
                  <dd style={{ margin: 0 }}>{fmtDateTime(data.registry.verifiedAt)}</dd>
                  <dt className="dp-label">Source</dt>
                  <dd style={{ margin: 0 }}>
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
                <RegistryVerification companyId={data.id} declaredName={data.declared.legalName} declaredForm={data.declared.legalForm} declaredRccm={data.declared.rccmNumber} manual={data.registryMode === "manual"} />
              </>
            )}
          </Panel>
        </div>

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

        <Panel title="Historique des décisions" controlId="CCI_DETAIL_HISTORY">
          {data.history.length === 0 ? (
            <StateBanner tone="info" title="Aucune décision enregistrée pour cette entreprise" controlId="CCI_DETAIL_HISTORY_EMPTY" />
          ) : (
            <div className="dp-tablewrap">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>Décision</th>
                    <th>Officier</th>
                    <th>Date</th>
                    <th>Portée déclarée</th>
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
