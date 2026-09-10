"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Checkbox, Field, Input, Panel, StateBanner } from "@dealpme/ui";

/**
 * Enregistrement d'une alerte sur les critères de la recherche en cours. Le consentement à recevoir des
 * messages est une case distincte, jamais pré-cochée, et l'alerte fonctionne sans lui : elle est simplement muette.
 */
export function SaveAlert({ current }: { current: Record<string, string | undefined> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/marketplace/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        sectorCode: current["sectorCode"] ?? null,
        regionCode: current["regionCode"] ?? null,
        turnoverBand: current["turnoverBand"] ?? null,
        dealReadyOnly: current["dealReadyOnly"] === "1",
        notifyOptIn: optIn,
      }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (data.ok) {
      setOpen(false);
      setDone(true);
      setLabel("");
      setOptIn(false);
      router.refresh();
      return;
    }
    setError(data.message ?? "Enregistrement impossible.");
  }

  if (done && !open) {
    return (
      <StateBanner tone="success" title="Alerte enregistrée" controlId="OPP_ALERT_DONE">
        Retrouvez-la dans <a href="/investisseur/alertes">vos alertes</a>, où le consentement se retire à tout moment.
      </StateBanner>
    );
  }

  if (!open) {
    return (
      <div className="dp-actions">
        <Button controlId="OPP_ALERT_OPEN" variant="secondary" onClick={() => setOpen(true)}>
          Enregistrer cette recherche
        </Button>
      </div>
    );
  }

  return (
    <Panel title="Enregistrer cette recherche" controlId="OPP_ALERT_FORM">
      <form onSubmit={submit} noValidate>
        {error ? <StateBanner tone="danger" title="Refusé" controlId="OPP_ALERT_ERROR">{error}</StateBanner> : null}
        <Field id="alert-label" label="Nom de l'alerte" hint="Par exemple : agroalimentaire dans le Grand Lomé.">
          <Input id="alert-label" required minLength={2} value={label} onChange={(e) => setLabel(e.target.value)} data-control-id="OPP_ALERT_LABEL" />
        </Field>
        <Checkbox
          id="alert-optin"
          label="J'accepte d'être prévenu par email lorsqu'une opportunité correspond à ces critères."
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          data-control-id="OPP_ALERT_OPTIN"
        />
        <p className="dp-muted" style={{ fontSize: "0.82rem" }}>
          Sans cette case, l'alerte est conservée mais n'envoie rien. Le consentement se retire à tout moment.
        </p>
        <Actions>
          <Button controlId="OPP_ALERT_SUBMIT" type="submit" state={busy ? "loading" : "default"}>
            Enregistrer
          </Button>
          <Button controlId="OPP_ALERT_CANCEL" type="button" variant="ghost" onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </Actions>
      </form>
    </Panel>
  );
}
