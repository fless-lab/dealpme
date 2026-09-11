import { DecisionGate, Panel, StateBanner, StatusBadge } from "@dealpme/ui";
import { api } from "../../../../../lib/api";
import { fmtDate, fmtDateTime, requireRole } from "../../../../../lib/guards";
import type { Dossier } from "../../../../../lib/dossier";
import { DealReadyScope } from "../../../../../components/deal-ready";
import { RequestCertification } from "./request-certification";

interface Criterion {
  key: string;
  label: string;
  scope: string;
  state: "SATISFIED" | "MISSING";
  remedy?: string;
  blocking: boolean;
}

interface CertificationView {
  company: { id: string; legalName: string };
  checklist: { criteria: Criterion[]; requestable: boolean; missingBlocking: number; scope: string; limits: string[] };
  open: { id: string; state: string; remediationItems: { label: string; detail: string | null }[]; requestedAt: string; remediationSetAt: string | null } | null;
  requests: { id: string; state: string; requestedAt: string; closedAt: string | null }[];
  decisions: { id: string; decision: string; scopeStatement: string; decidedAt: string; expiresAt: string | null; revocationReason: string | null }[];
  certification: { isDealReady: boolean; decision: string | null; scopeStatement: string | null; decidedAt: string | null; expiresAt: string | null };
}

const REQUEST_STATE: Record<string, string> = {
  REQUESTED: "En attente d'instruction",
  REMEDIATION_REQUIRED: "Compléments demandés",
  DECIDED: "Décidée",
  WITHDRAWN: "Retirée",
};

const DECISION: Record<string, string> = { GRANTED: "Accordée", REFUSED: "Refusée", REVOKED: "Retirée", EXPIRED: "Expirée" };

/**
 * Certification Deal-Ready vue par l'entreprise : les critères que l'officier appliquera, ce qu'il reste
 * à produire, le dépôt de la demande, et la remédiation quand elle est demandée.
 */
export default async function CertificationPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const { token } = await requireRole("SELLER", "ADVISOR");
  const dossier = await api<Dossier & { companyId?: string }>(`/deals/${dealId}/dossier`, { token });
  const deal = await api<{ companyId: string }>(`/deals/${dealId}`, { token });
  const view = await api<CertificationView>(`/companies/${deal.companyId}/certification`, { token });

  return (
    <div className="dp-stack">
      <div>
        <h1>Certification Deal-Ready</h1>
        <p className="dp-muted">
          Décidée par un officier nommé de la CCI-Togo, jamais par la plateforme. Cette page montre exactement les
          critères qu'il appliquera.
        </p>
      </div>

      {view.certification.decision ? (
        <Panel title="Décision en vigueur" controlId="SELLER_CERT_CURRENT">
          <div className="dp-actions" style={{ alignItems: "center" }}>
            <StatusBadge status={view.certification.isDealReady ? "verified" : "revoked"} label={DECISION[view.certification.decision] ?? view.certification.decision} controlId="SELLER_CERT_BADGE" />
            {view.certification.decidedAt ? <span className="dp-muted">le {fmtDate(view.certification.decidedAt)}</span> : null}
            {view.certification.expiresAt ? <span className="dp-muted">expire le {fmtDate(view.certification.expiresAt)}</span> : null}
          </div>
          <div style={{ height: 12 }} />
          <DealReadyScope scopeStatement={view.certification.scopeStatement} limits={view.checklist.limits} />
        </Panel>
      ) : null}

      {view.open?.state === "REMEDIATION_REQUIRED" ? (
        <StateBanner tone="warning" title="Compléments demandés par la CCI-Togo" controlId="SELLER_CERT_REMEDIATION">
          <p style={{ marginTop: 4 }}>Reprenez ces points, puis signalez-le à la CCI-Togo. La demande reste ouverte.</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {view.open.remediationItems.map((i) => (
              <li key={i.label}>
                <b>{i.label}</b>
                {i.detail ? <div>{i.detail}</div> : null}
              </li>
            ))}
          </ul>
          {view.open.remediationSetAt ? <p className="dp-muted" style={{ marginBottom: 0 }}>Demandés le {fmtDateTime(view.open.remediationSetAt)}</p> : null}
        </StateBanner>
      ) : null}

      <Panel title="Liste de contrôle" controlId="SELLER_CERT_CHECKLIST">
        <p className="dp-muted" style={{ marginTop: 0 }}>
          Les critères marqués comme bloquants doivent être satisfaits pour déposer une demande. Le dernier critère est
          informatif : il n'empêche rien.
        </p>
        {view.checklist.criteria.map((c) => (
          <div key={c.key} className="dp-criteria-row" data-control-id="SELLER_CERT_CRITERION">
            <StatusBadge status={c.state === "SATISFIED" ? "verified" : c.blocking ? "pending" : "restricted"} label={c.state === "SATISFIED" ? "Satisfait" : c.blocking ? "À produire" : "Informatif"} />
            <div>
              <b>{c.label}</b>
              <div className="dp-muted" style={{ fontSize: "0.82rem" }}>{c.scope}</div>
              {c.remedy ? <div style={{ marginTop: 4 }}>{c.remedy}</div> : null}
            </div>
          </div>
        ))}
      </Panel>

      <DecisionGate
        kind="certification"
        title="Demande de certification"
        state={view.open ? "decided" : view.checklist.requestable ? "ready" : "blocked"}
        {...(view.open ? { decidedBy: "Vous", decidedAt: fmtDateTime(view.open.requestedAt) } : {})}
        controlId="SELLER_CERT_GATE"
      >
        {view.open ? (
          <StateBanner tone="info" title={REQUEST_STATE[view.open.state] ?? view.open.state} controlId="SELLER_CERT_OPEN">
            Votre demande du {fmtDateTime(view.open.requestedAt)} est en cours d'instruction. Vous pouvez la retirer
            tant qu'aucune décision n'a été prise.
          </StateBanner>
        ) : view.checklist.requestable ? (
          <p style={{ marginTop: 0 }}>Tous les critères bloquants sont satisfaits. La demande part vers la CCI-Togo.</p>
        ) : (
          <StateBanner tone="warning" title={`${view.checklist.missingBlocking} critère(s) à produire`} controlId="SELLER_CERT_BLOCKED">
            La demande ne peut pas être déposée tant que les critères ci-dessus ne sont pas satisfaits.
          </StateBanner>
        )}
        <RequestCertification companyId={view.company.id} requestable={view.checklist.requestable} open={view.open ? { id: view.open.id, state: view.open.state } : null} />
      </DecisionGate>

      <Panel title="Historique" controlId="SELLER_CERT_HISTORY">
        {view.requests.length === 0 && view.decisions.length === 0 ? (
          <StateBanner tone="info" title="Aucune demande ni décision pour le moment" controlId="SELLER_CERT_HISTORY_EMPTY" />
        ) : (
          <div className="dp-tablewrap">
            <table className="dp-table">
              <thead>
                <tr>
                  <th scope="col">Événement</th>
                  <th scope="col">État</th>
                  <th scope="col">Date</th>
                  <th scope="col">Détail</th>
                </tr>
              </thead>
              <tbody>
                {view.requests.map((r) => (
                  <tr key={r.id}>
                    <td>Demande</td>
                    <td>{REQUEST_STATE[r.state] ?? r.state}</td>
                    <td>{fmtDateTime(r.requestedAt)}</td>
                    <td>{r.closedAt ? `Close le ${fmtDate(r.closedAt)}` : "En cours"}</td>
                  </tr>
                ))}
                {view.decisions.map((d) => (
                  <tr key={d.id}>
                    <td>Décision</td>
                    <td>{DECISION[d.decision] ?? d.decision}</td>
                    <td>{fmtDateTime(d.decidedAt)}</td>
                    <td style={{ maxWidth: "44ch" }}>
                      {d.scopeStatement}
                      {d.revocationReason ? <div className="dp-muted">Motif : {d.revocationReason}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {dossier.status === "DRAFT" ? (
        <StateBanner tone="info" title="Le dossier est encore en préparation" controlId="SELLER_CERT_DRAFT">
          La certification porte sur l'entreprise, mais l'un de ses critères est la soumission du dossier de
          transmission. Terminez le récapitulatif et soumettez-le.
        </StateBanner>
      ) : null}
    </div>
  );
}
