"use client";

import type { ReactNode } from "react";
import { Badge } from "./primitives";
import type { DealLensAnswerModel, DocumentModel, QnaThreadModel } from "./types";

/**
 * Composants de la data room (V2) et de VDR Intelligence (V5). Le contrat est figé dès V1 pour que
 * les écrans se composent sans réorganisation. Aucun de ces composants ne décide d'une permission.
 */

export function VDRFolder({ name, count, current, cleanTeam, onSelect, controlId = "VDR_SELECT_FOLDER" }: { name: string; count: number; current?: boolean; cleanTeam?: boolean; onSelect?: () => void; controlId?: string }) {
  return (
    <div className="dp-vdr-folder" role="button" tabIndex={0} aria-current={current || undefined} data-clean-team={cleanTeam || undefined} data-control-id={controlId} onClick={onSelect} onKeyDown={(e) => (e.key === "Enter" ? onSelect?.() : undefined)}>
      <span>{name}</span>
      <span className="dp-muted dp-tabular" style={{ marginLeft: "auto" }}>
        {count}
      </span>
    </div>
  );
}

const DOC_STATE_LABEL = { view: "Consultation", download: "Téléchargement autorisé", blocked: "Téléchargement bloqué", superseded: "Remplacé", revoked: "Révoqué" } as const;

/** DocumentRow : consultation par défaut, téléchargement seulement si accordé (DOC-01), versions et révocation visibles. */
export function DocumentRow({ doc, onOpen, controlId = "VDR_SELECT_DOCUMENT" }: { doc: DocumentModel; onOpen?: () => void; controlId?: string }) {
  return (
    <div className="dp-doc-row" data-state={doc.state} data-control-id={controlId}>
      <div>
        <b>{doc.title}</b>
        {doc.cleanTeam ? <Badge tone="warning">Clean Team</Badge> : null}
      </div>
      <span className="dp-secondary dp-muted">
        v{doc.version} · {doc.updatedAt}
      </span>
      <span className="dp-secondary">{DOC_STATE_LABEL[doc.state]}</span>
      <button type="button" className="dp-btn dp-btn-ghost" data-control-id="OPEN_DOCUMENT" onClick={onOpen} disabled={doc.state === "revoked"}>
        Ouvrir
      </button>
    </div>
  );
}

/** SecureViewer : rendu serveur page à page ; filigrane avec identité du lecteur ; protection honnête (dissuasion, attribution). */
export function SecureViewer({ pageImageUrl, page, pageCount, watermark, controlId = "SECURE_VIEWER" }: { pageImageUrl: string | null; page: number; pageCount: number; watermark: string; controlId?: string }) {
  return (
    <div className="dp-viewer" data-control-id={controlId} aria-label={`Page ${page} sur ${pageCount}`}>
      {pageImageUrl ? <img src={pageImageUrl} alt={`Page ${page}`} style={{ maxWidth: "100%" }} /> : <span className="dp-muted">Chargement de la page</span>}
      <div className="dp-watermark" aria-hidden="true">
        {watermark}
      </div>
    </div>
  );
}

/** DealLensAnswer : réponse fondée sur des preuves ; citations toujours visibles ; état d'insuffisance explicite. */
export function DealLensAnswer({ model, controlId = "DEALLENS_ANSWER" }: { model: DealLensAnswerModel; controlId?: string }) {
  const confidence = { HIGH: "Confiance élevée", MEDIUM: "Confiance moyenne", INSUFFICIENT: "Preuves insuffisantes : aucune conclusion" }[model.confidence];
  return (
    <div className="dp-answer" data-confidence={model.confidence} data-scope={model.scope} data-control-id={controlId}>
      <Badge tone={model.confidence === "INSUFFICIENT" ? "warning" : model.confidence === "HIGH" ? "success" : "info"}>{confidence}</Badge>
      <p style={{ margin: "8px 0" }}>{model.answer}</p>
      {model.citations.length > 0 ? (
        <div className="dp-citations" aria-label="Citations">
          {model.citations.map((c) => (
            <a key={`${c.documentId}-${c.page}`} href={c.href ?? "#"} data-control-id="DEAL_LENS_CITATION_OPEN">
              {c.documentTitle ?? c.documentId}, p. {c.page}
            </a>
          ))}
        </div>
      ) : null}
      {model.potentialIssues && model.potentialIssues.length > 0 ? (
        <p className="dp-muted" style={{ fontSize: "0.85rem" }}>
          Points d'attention : {model.potentialIssues.join(" ; ")}
        </p>
      ) : null}
    </div>
  );
}

/** DealLensPanel : panneau IA (résumé, faits, risques, comparer, Q&R) ; lecture seule par construction. */
export function DealLensPanel({ tabs, active, onSelect, children }: { tabs: { id: string; label: string; controlId: string }[]; active: string; onSelect?: (id: string) => void; children: ReactNode }) {
  return (
    <section className="dp-deallens" aria-label="DealLens IA" data-control-id="OPEN_DEALLENS">
      <div className="dp-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === active} data-control-id={t.controlId} onClick={() => onSelect?.(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div>{children}</div>
      <div className="dp-muted" style={{ fontSize: "0.78rem", padding: "8px 16px", borderTop: "1px solid var(--dp-line)" }}>
        DealLens explique et résume à partir des documents auxquels vous avez accès. Il ne certifie, ne publie et ne décide jamais.
      </div>
    </section>
  );
}

/** EvidenceNode : nœud du graphe de preuves (Document, Fait, Métrique, Risque, Q&R, Clause). */
export function EvidenceNode({ kind, label, href }: { kind: "Document" | "Fact" | "Metric" | "Risk" | "QA" | "ContractTerm"; label: string; href?: string }) {
  const content = (
    <span className="dp-evidence-node" data-kind={kind}>
      <span className="dp-label">{kind}</span>
      {label}
    </span>
  );
  return href ? (
    <a href={href} style={{ textDecoration: "none" }} data-control-id="OPEN_RELATED_DOCUMENT">
      {content}
    </a>
  ) : (
    content
  );
}

/** QnAThread : question liée à un document, visibilité contrôlée par le cédant, réponse attribuée. */
export function QnAThread({ thread, controlId = "QA_THREAD" }: { thread: QnaThreadModel; controlId?: string }) {
  const status = { OPEN: "Ouverte", ANSWERED: "Répondue", CLOSED: "Clôturée" }[thread.status];
  return (
    <article className="dp-qna" data-status={thread.status} data-control-id={controlId}>
      <div className="dp-meta">
        <span>{thread.category}</span>
        {thread.documentTitle ? <span>{thread.documentTitle}</span> : null}
        <span>
          {thread.author} · {thread.askedAt}
        </span>
        <Badge tone={thread.status === "ANSWERED" ? "success" : thread.status === "CLOSED" ? "neutral" : "warning"}>{status}</Badge>
      </div>
      <p style={{ margin: 0 }}>{thread.question}</p>
      {thread.answer ? (
        <div className="dp-reply">
          <p style={{ margin: 0 }}>{thread.answer.text}</p>
          <span className="dp-muted" style={{ fontSize: "0.78rem" }}>
            {thread.answer.by} · {thread.answer.at}
          </span>
        </div>
      ) : null}
    </article>
  );
}

/** MiniDocument : aperçu compact d'un document (titre, dossier, version) pour les listes liées. */
export function MiniDocument({ doc }: { doc: Pick<DocumentModel, "title" | "folder" | "version"> }) {
  return (
    <div className="dp-minidoc">
      <b>{doc.title}</b>
      <span className="dp-muted">
        {doc.folder} · v{doc.version}
      </span>
    </div>
  );
}
