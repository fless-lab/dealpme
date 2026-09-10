"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Field, StateBanner, Textarea } from "@dealpme/ui";

/**
 * Renvoi d'un dossier soumis vers la préparation. Le motif est obligatoire : un dossier qui revient sans
 * explication oblige le cédant à deviner, et le serveur refuse un renvoi muet.
 */
export function ReturnDossier({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/institution/deals/${dealId}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (data.ok) {
      setOpen(false);
      setReason("");
      router.refresh();
      return;
    }
    setError(data.message ?? "Renvoi impossible.");
  }

  if (!open) {
    return (
      <Button controlId="CCI_RETURN_OPEN" variant="secondary" onClick={() => setOpen(true)}>
        Renvoyer en préparation
      </Button>
    );
  }

  return (
    <form onSubmit={submit} style={{ minWidth: 280 }} noValidate>
      {error ? <StateBanner tone="danger" title="Refusé" controlId="CCI_RETURN_ERROR">{error}</StateBanner> : null}
      <Field id={`reason-${dealId}`} label="Ce qui doit être repris" hint="Le cédant lira ce texte à l'ouverture de son dossier.">
        <Textarea id={`reason-${dealId}`} rows={3} required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} data-control-id="CCI_RETURN_REASON" />
      </Field>
      <Actions>
        <Button controlId="CCI_RETURN_SUBMIT" type="submit" state={busy ? "loading" : "default"}>
          Renvoyer
        </Button>
        <Button controlId="CCI_RETURN_CANCEL" type="button" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </Actions>
    </form>
  );
}
