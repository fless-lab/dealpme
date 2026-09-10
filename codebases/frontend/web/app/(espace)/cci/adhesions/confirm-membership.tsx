"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Field, Input, StateBanner } from "@dealpme/ui";

/** Saisie de la référence de confirmation d'adhésion. Rien d'autre n'est stocké de la base des membres. */
export function ConfirmMembership({ organisationId, organisationName, alreadyConfirmed }: { organisationId: string; organisationName: string; alreadyConfirmed: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/institution/membership-confirmations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organisationId, confirmationRef: ref }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (data.ok) {
      setOpen(false);
      setRef("");
      router.refresh();
      return;
    }
    setError(data.message ?? "Confirmation impossible.");
  }

  if (!open) {
    return (
      <Button controlId="CCI_MEMBERSHIP_OPEN" variant={alreadyConfirmed ? "ghost" : "secondary"} onClick={() => setOpen(true)}>
        {alreadyConfirmed ? "Mettre à jour" : "Confirmer l'adhésion"}
      </Button>
    );
  }
  return (
    <form onSubmit={submit} style={{ minWidth: 260 }} noValidate>
      {error ? <StateBanner tone="danger" title="Refusé" controlId="CCI_MEMBERSHIP_ERROR">{error}</StateBanner> : null}
      <Field id={`ref-${organisationId}`} label={`Référence CCI-Togo pour ${organisationName}`} hint="Référence figurant sur l'attestation d'adhésion.">
        <Input id={`ref-${organisationId}`} required minLength={3} maxLength={64} value={ref} onChange={(e) => setRef(e.target.value)} data-control-id="CCI_MEMBERSHIP_REF" />
      </Field>
      <Actions>
        <Button controlId="CCI_MEMBERSHIP_SUBMIT" type="submit" state={busy ? "loading" : "default"}>
          Enregistrer
        </Button>
        <Button controlId="CCI_MEMBERSHIP_CANCEL" type="button" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </Actions>
    </form>
  );
}
