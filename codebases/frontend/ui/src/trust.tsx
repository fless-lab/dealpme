import type { ReactNode } from "react";
import type { Tone } from "./tokens";
import type { Evidence, PermissionLensModel, RailStage } from "./types";

/** StateBanner : info, succès, avertissement, danger ; états chargement, vide, hors ligne, bloqué, révoqué. */
export function StateBanner({ tone = "info", title, children, controlId }: { tone?: Tone; title: string; children?: ReactNode; controlId?: string }) {
  return (
    <div role="status" className="dp-state-banner" data-tone={tone} data-control-id={controlId}>
      <b>{title}</b>
      {children}
    </div>
  );
}

/** WarningStrip : mention permanente non fermable (données synthétiques, déclaré non audité, aide à la rédaction). */
export function WarningStrip({ text, controlId = "WARNING_STRIP" }: { text: string; controlId?: string }) {
  return (
    <div className="dp-warning-strip" data-control-id={controlId}>
      {text}
    </div>
  );
}

/** PartnerResponsibilityStrip : attribution explicite de la responsabilité d'un contenu à un partenaire ou à l'utilisateur. */
export function PartnerResponsibilityStrip({ partner, text }: { partner: string; text: string }) {
  return (
    <div className="dp-partner-strip" role="note">
      <b>{partner}</b>
      <span>{text}</span>
    </div>
  );
}

/**
 * PermissionLens : explique pourquoi l'accès est accordé, en attente, refusé ou bloqué réglementairement.
 * Purement informatif : le client affiche les permissions, il ne les calcule ni ne les accorde jamais.
 */
export function PermissionLens({ model, controlId = "PERMISSION_LENS" }: { model: PermissionLensModel; controlId?: string }) {
  const stateLabel = { granted: "Autorisé", pending: "En attente", denied: "Refusé", regulatory: "Blocage réglementaire" }[model.state];
  return (
    <section className="dp-permission" data-state={model.state} data-control-id={controlId} aria-label="Permission Lens">
      <span className="dp-tier">{model.tier}</span>
      <div>
        <b>{stateLabel}</b>
        {model.missing && model.missing.length > 0 ? <div className="dp-muted">Manque : {model.missing.join(", ")}</div> : null}
      </div>
      <div className="dp-why">{model.reason}</div>
      {model.nextAction ? (
        <div style={{ gridColumn: "1 / -1" }}>
          {model.nextAction.href ? (
            <a className="dp-btn dp-btn-secondary" href={model.nextAction.href} data-control-id={model.nextAction.controlId}>
              {model.nextAction.label}
            </a>
          ) : (
            <span className="dp-muted">{model.nextAction.label}</span>
          )}
        </div>
      ) : null}
    </section>
  );
}

/** TransactionRail : progression ; défilement horizontal sur mobile. Le composant affiche, il ne décide pas. */
export function TransactionRail({ stages, current, terminal, controlId = "TRANSACTION_RAIL" }: { stages: RailStage[]; current: string; terminal?: string; controlId?: string }) {
  const idx = stages.findIndex((s) => s.id === current);
  return (
    <ol className="dp-rail" data-control-id={controlId} aria-label="Progression de la transaction">
      {stages.map((s, i) => {
        const state = s.id === terminal ? "terminal" : i < idx ? "done" : i === idx ? "current" : "future";
        return (
          <li key={s.id} data-state={state} aria-current={state === "current" ? "step" : undefined}>
            <span className="dp-dot">{i + 1}</span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}

/** EvidenceStrip : Fait, Source, Qualité, Confiance, Date. Provenance visible sur chaque donnée déclarée. */
export function EvidenceStrip({ evidence, variant = "4-cell" }: { evidence: Evidence; variant?: "4-cell" | "compact" }) {
  const quality = { declared: "Déclaré, non audité", documented: "Documenté", reviewed: "Revu" }[evidence.quality];
  const confidence = { LOW: "Faible", MEDIUM: "Moyenne", HIGH: "Élevée" }[evidence.confidence];
  return (
    <div className="dp-evidence" data-variant={variant}>
      <div>
        <b>Source</b>
        {evidence.source}
      </div>
      <div>
        <b>Qualité</b>
        {quality}
      </div>
      <div>
        <b>Confiance</b>
        {confidence}
      </div>
      <div>
        <b>Revue</b>
        {evidence.reviewedAt}
      </div>
    </div>
  );
}

/** DecisionGate : cadre d'une décision humaine nommée (admission, certification, offre). Jamais présentée comme automatique. */
export function DecisionGate({
  kind,
  title,
  state,
  decidedBy,
  decidedAt,
  children,
  controlId,
}: {
  kind: "admission" | "certification" | "offer";
  title: string;
  state: "ready" | "blocked" | "decided";
  decidedBy?: string | null;
  decidedAt?: string | null;
  children?: ReactNode;
  controlId: string;
}) {
  return (
    <section className="dp-decision" data-kind={kind} data-state={state} data-control-id={controlId}>
      <h3>{title}</h3>
      <p className="dp-decider">
        {state === "decided" && decidedBy ? `Décision de ${decidedBy}${decidedAt ? ` le ${decidedAt}` : ""}` : state === "blocked" ? "Décision impossible en l'état" : "Décision humaine en attente"}
      </p>
      {children}
    </section>
  );
}
