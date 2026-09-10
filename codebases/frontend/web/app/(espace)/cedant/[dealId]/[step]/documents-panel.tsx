"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Panel, StateBanner, StatusBadge } from "@dealpme/ui";
import { fmtSize, type DossierDocument, type Requirement } from "../../../../../lib/dossier";

/**
 * Dépôt des pièces. Chaque fichier est analysé par l'antivirus avant d'être enregistré : un fichier
 * refusé n'est jamais stocké. Le contenu se relit par l'application, jamais par une adresse de stockage.
 */
export function DocumentsPanel({ dealId, requirements, documents, readOnly }: { dealId: string; requirements: Requirement[]; documents: DossierDocument[]; readOnly: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ category: string; message: string } | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const byCategory = new Map(documents.map((d) => [d.category, d]));

  async function upload(category: string, label: string, file: File) {
    setBusy(category);
    setError(null);
    const body = new FormData();
    body.append("category", category);
    body.append("title", label);
    body.append("file", file);
    const res = await fetch(`/api/dossier/${dealId}/documents`, { method: "POST", body });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(null);
    if (data.ok) {
      router.refresh();
      return;
    }
    setError({ category, message: data.message ?? "Dépôt impossible." });
  }

  return (
    <Panel title="Pièces justificatives" controlId="SELLER_DOCS">
      <p className="dp-muted" style={{ marginTop: 0 }}>
        Formats acceptés : PDF, image JPEG ou PNG, classeur Excel, document Word. Chaque fichier est analysé avant
        enregistrement. Déposer une nouvelle version conserve la précédente.
      </p>
      {requirements.map((r) => {
        const category = r.category as string;
        const existing = byCategory.get(category);
        return (
          <div key={category} style={{ borderTop: "1px solid var(--dp-line)", padding: "16px 0" }} data-control-id="SELLER_DOC_ROW">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 320px" }}>
                <div className="dp-label">{r.label}</div>
                {existing ? (
                  <>
                    <div>
                      <a href={`/api/dossier/${dealId}/documents/${existing.id}/content`} target="_blank" rel="noreferrer" data-control-id="SELLER_DOC_OPEN">
                        {existing.fileName}
                      </a>{" "}
                      <span className="dp-muted">({fmtSize(existing.sizeBytes)})</span>
                    </div>
                    <div className="dp-muted" style={{ fontSize: "0.78rem" }}>
                      Version {existing.version} - analysée par {existing.scanEngine} - empreinte {existing.sha256.slice(0, 12)}
                    </div>
                  </>
                ) : (
                  <StatusBadge status="pending" label="Pièce attendue" controlId="SELLER_DOC_MISSING" />
                )}
                {r.help ? <p className="dp-muted" style={{ fontSize: "0.82rem", margin: "4px 0 0" }}>{r.help}</p> : null}
              </div>
              {!readOnly ? (
                <div>
                  <input
                    ref={(el) => {
                      inputs.current[category] = el;
                    }}
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void upload(category, r.label, file);
                      e.target.value = "";
                    }}
                    data-control-id="SELLER_DOC_INPUT"
                  />
                  <Button
                    controlId="SELLER_DOC_UPLOAD"
                    variant={existing ? "ghost" : "secondary"}
                    state={busy === category ? "loading" : "default"}
                    onClick={() => inputs.current[category]?.click()}
                  >
                    {existing ? "Remplacer" : "Déposer"}
                  </Button>
                </div>
              ) : null}
            </div>
            {error?.category === category ? (
              <div style={{ marginTop: 12 }}>
                <StateBanner tone="danger" title="Fichier refusé" controlId="SELLER_DOC_ERROR">
                  {error.message}
                </StateBanner>
              </div>
            ) : null}
          </div>
        );
      })}
    </Panel>
  );
}
