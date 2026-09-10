"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Field, Input, StateBanner, Textarea } from "@dealpme/ui";

interface Item {
  label: string;
  detail: string | null;
}

/**
 * Demande de compléments. Chaque point est libellé : une remédiation vague fait perdre un aller-retour
 * à l'entreprise et à l'officier. La demande reste ouverte, elle n'est pas refusée.
 */
export function Remediation({ requestId, existing }: { requestId: string; existing: Item[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>(existing.length > 0 ? existing : [{ label: "", detail: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = items.filter((i) => i.label.trim().length >= 3).map((i) => ({ label: i.label.trim(), detail: i.detail?.trim() || null }));
    if (payload.length === 0) {
      setError("Nommez au moins un point à reprendre.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/institution/certification-requests/${requestId}/remediation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (data.ok) {
      setOpen(false);
      router.refresh();
      return;
    }
    setError(data.message ?? "Envoi impossible.");
  }

  if (!open) {
    return (
      <Button controlId="CCI_REMEDIATION_OPEN" variant="secondary" onClick={() => setOpen(true)}>
        {existing.length > 0 ? "Mettre à jour les compléments" : "Demander des compléments"}
      </Button>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {error ? <StateBanner tone="danger" title="Refusé" controlId="CCI_REMEDIATION_ERROR">{error}</StateBanner> : null}
      {items.map((it, i) => (
        <div key={i} style={{ borderTop: i > 0 ? "1px solid var(--dp-line)" : "none", paddingTop: i > 0 ? 12 : 0 }}>
          <Field id={`rem-label-${i}`} label={`Point ${i + 1}`} hint="Ce que l'entreprise lira. Trois caractères minimum.">
            <Input id={`rem-label-${i}`} value={it.label} onChange={(e) => update(i, { label: e.target.value })} data-control-id="CCI_REMEDIATION_LABEL" />
          </Field>
          <Field id={`rem-detail-${i}`} label="Précision (facultatif)">
            <Textarea id={`rem-detail-${i}`} rows={2} value={it.detail ?? ""} onChange={(e) => update(i, { detail: e.target.value })} data-control-id="CCI_REMEDIATION_DETAIL" />
          </Field>
        </div>
      ))}
      <Actions>
        <Button controlId="CCI_REMEDIATION_ADD" type="button" variant="ghost" onClick={() => setItems((p) => [...p, { label: "", detail: "" }])}>
          Ajouter un point
        </Button>
        <Button controlId="CCI_REMEDIATION_SUBMIT" type="submit" state={busy ? "loading" : "default"}>
          Envoyer à l'entreprise
        </Button>
        <Button controlId="CCI_REMEDIATION_CANCEL" type="button" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </Actions>
    </form>
  );
}
