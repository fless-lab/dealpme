import type { ReactNode } from "react";
import { Badge, StatusBadge } from "./primitives";
import type { CriteriaRow, Risk } from "./types";

/** Metric : chiffre décisionnel, tabulaire, avec note et variation. Cinq, trois, deux puis une colonne selon la largeur. */
export function Metrics({ children }: { children: ReactNode }) {
  return <div className="dp-metrics">{children}</div>;
}

export function Metric({ label, value, note, tone, delta }: { label: string; value: string; note?: string; tone?: "neutral" | "warning"; delta?: { dir: "up" | "down"; text: string } }) {
  return (
    <div className="dp-metric" data-tone={tone ?? "neutral"}>
      <div className="dp-label">{label}</div>
      <div className="dp-val">{value}</div>
      {delta ? (
        <div className="dp-delta" data-dir={delta.dir}>
          {delta.text}
        </div>
      ) : null}
      {note ? <div className="dp-muted" style={{ fontSize: "0.8rem" }}>{note}</div> : null}
    </div>
  );
}

/** FinancialTable : surfaces denses en tableau, jamais en grille de cartes ; défilement dans son conteneur. */
export function FinancialTable({ caption, columns, rows, numeric = [] }: { caption: string; columns: string[]; rows: (string | number)[][]; numeric?: number[] }) {
  return (
    <div className="dp-tablewrap">
      <table className="dp-table">
        <caption className="dp-label" style={{ textAlign: "left", padding: "8px 12px" }}>
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c} className={numeric.includes(i) ? "dp-num" : undefined}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => (
                <td key={ci} className={numeric.includes(ci) ? "dp-num" : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** DealRow : ligne d'opportunité (hybride tableau-carte), affichée au palier autorisé par le serveur. */
export function DealRow({
  title,
  sector,
  region,
  band,
  dealTypeLabel,
  dealReady,
  tier,
  href,
  controlId = "OPP_CARD",
}: {
  title: string;
  sector: string;
  region: string;
  band: string;
  dealTypeLabel: string;
  dealReady: boolean;
  tier: "T0" | "T1" | "T2";
  href: string;
  controlId?: string;
}) {
  return (
    <a href={href} className="dp-row" data-control-id={controlId} data-tier={tier} style={{ textDecoration: "none", color: "inherit" }}>
      <div>
        <div className="dp-title">{title}</div>
        <div className="dp-muted" style={{ fontSize: "0.82rem" }}>{dealTypeLabel}</div>
      </div>
      <div className="dp-secondary">{sector}</div>
      <div className="dp-secondary">{region}</div>
      <div className="dp-secondary dp-tabular">{band}</div>
      <div>{dealReady ? <StatusBadge status="verified" label="Deal-Ready CCI-Togo" /> : <Badge tone="neutral">{tier}</Badge>}</div>
    </a>
  );
}

/** CriteriaMatrix : critères et pièces attendues (Deal-Ready, checklist), avec état par ligne. */
export function CriteriaMatrix({ rows, controlId }: { rows: CriteriaRow[]; controlId?: string }) {
  const tone = { missing: "danger", declared: "warning", reviewed: "info", certified: "success", ok: "success", ko: "danger" } as const;
  const label = { missing: "Manquant", declared: "Déclaré", reviewed: "Revu", certified: "Certifié", ok: "Conforme", ko: "Non conforme" } as const;
  return (
    <div className="dp-criteria" data-control-id={controlId}>
      {rows.map((r) => (
        <div key={r.label}>
          <span>{r.label}</span>
          <Badge tone={tone[r.state]}>{label[r.state]}</Badge>
          <span className="dp-muted">{r.detail ?? ""}</span>
        </div>
      ))}
    </div>
  );
}

/** ReadinessPanel : préparation transactionnelle (côté dossier) séparée de la certification institutionnelle. */
export function ReadinessPanel({ domains, certification }: { domains: { name: string; state: CriteriaRow["state"]; detail?: string }[]; certification: { isDealReady: boolean; scopeStatement: string | null; decidedBy?: string | null; decidedAt?: string | null } }) {
  return (
    <div className="dp-stack">
      <section className="dp-panel">
        <h3>Préparation du dossier</h3>
        <CriteriaMatrix rows={domains.map((d) => (d.detail === undefined ? { label: d.name, state: d.state } : { label: d.name, state: d.state, detail: d.detail }))} controlId="READINESS_DOMAINS" />
      </section>
      <section className="dp-panel" data-control-id="READINESS_CERTIFICATION">
        <h3>Certification Deal-Ready</h3>
        {certification.isDealReady ? (
          <>
            <StatusBadge status="verified" label="Deal-Ready CCI-Togo" />
            <p className="dp-muted" style={{ marginTop: 8 }}>
              Décision de {certification.decidedBy ?? "l'officier CCI-Togo"}
              {certification.decidedAt ? ` le ${certification.decidedAt}` : ""}. Portée : {certification.scopeStatement}
            </p>
          </>
        ) : (
          <p className="dp-muted">Aucune certification en cours de validité. La décision appartient à la CCI-Togo ; elle n'est jamais automatique.</p>
        )}
      </section>
    </div>
  );
}

/** CoverageRow : couverture d'un domaine de diligence (indicateur de complétude, jamais un avis d'audit). */
export function CoverageRow({ domain, ratio, gaps }: { domain: string; ratio: number; gaps: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <div className="dp-coverage">
      <span>{domain}</span>
      <div className="dp-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="dp-tabular dp-muted">
        {pct} % · {gaps} manque{gaps > 1 ? "s" : ""}
      </span>
    </div>
  );
}

const SEVERITY_TONE = { LOW: "success", MEDIUM: "warning", HIGH: "danger", CRITICAL: "danger" } as const;

/** IssueRow : ligne du registre de risques (Issue Radar) ; colonnes secondaires repliées sur mobile. */
export function IssueRow({ risk, href, controlId = "ISSUE_ROW" }: { risk: Risk; href?: string; controlId?: string }) {
  const status = { open: "Ouvert", investigating: "En analyse", mitigated: "Atténué", closed: "Clos" }[risk.status];
  return (
    <div className="dp-issue" data-category={risk.category} data-control-id={controlId}>
      <Badge tone={SEVERITY_TONE[risk.severity]}>{risk.severity}</Badge>
      <b>{risk.title}</b>
      <span className="dp-secondary dp-muted">{risk.impact.join(" / ")}</span>
      <span className="dp-secondary">{status}</span>
      {href ? (
        <a href={href} data-control-id={`${controlId}_OPEN`}>
          Voir
        </a>
      ) : (
        <span />
      )}
    </div>
  );
}

/** RiskImpactCard : impact d'un risque sur le deal (prix, SPA, condition suspensive, financement, intégration). */
export function RiskImpactCard({ risk, evidenceCount }: { risk: Risk; evidenceCount: number }) {
  return (
    <section className="dp-panel" data-control-id="RISK_IMPACT_CARD">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <Badge tone={SEVERITY_TONE[risk.severity]}>{risk.severity}</Badge>
        <b>{risk.title}</b>
      </div>
      <div className="dp-muted" style={{ fontSize: "0.85rem" }}>
        Impact : {risk.impact.join(", ")} · {evidenceCount} preuve{evidenceCount > 1 ? "s" : ""} liée{evidenceCount > 1 ? "s" : ""}
      </div>
    </section>
  );
}
