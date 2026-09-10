"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Field, Input, StateBanner, StatusBadge, Textarea } from "@dealpme/ui";
import { SOURCE_LABEL, fmtXof, type DeclaredFact, type Requirement } from "../../../../../lib/dossier";

/**
 * Saisie d'une valeur déclarée. Une valeur déjà présente n'est pas modifiée sur place : le formulaire
 * enregistre une nouvelle version, et la précédente reste dans l'historique avec sa date et sa source.
 */
export function FactForm({ dealId, requirement, current, readOnly }: { dealId: string; requirement: Requirement; current: DeclaredFact | null; readOnly: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [period, setPeriod] = useState(current?.periodLabel ?? String(new Date().getFullYear() - 1));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = requirement.key ?? "fact";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = {
      fieldKey: requirement.key,
      source: note ? "SUPPORTING_DOCUMENT" : "SELLER_DECLARATION",
      ...(requirement.periodic ? { periodLabel: period } : {}),
      ...(note ? { note } : {}),
    };
    if (requirement.amount) {
      const amount = Number(value.replace(/[^\d]/g, ""));
      if (!Number.isFinite(amount) || amount <= 0) {
        setBusy(false);
        setError("Saisissez un montant en FCFA, sans décimale.");
        return;
      }
      payload["valueAmountXof"] = amount;
    } else {
      payload["valueText"] = value;
    }
    const res = await fetch(`/api/dossier/${dealId}/facts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (data.ok) {
      setOpen(false);
      setValue("");
      setNote("");
      router.refresh();
      return;
    }
    setError(data.message ?? "Enregistrement impossible.");
  }

  return (
    <div style={{ borderTop: "1px solid var(--dp-line)", padding: "16px 0" }} data-control-id="SELLER_FACT_ROW">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px" }}>
          <div className="dp-label">{requirement.label}</div>
          {current ? (
            <>
              <div style={{ fontSize: "1.05rem" }}>
                {requirement.amount ? fmtXof(current.valueAmountXof) : current.valueText}
                {current.periodLabel ? <span className="dp-muted"> ({current.periodLabel})</span> : null}
              </div>
              <div className="dp-muted" style={{ fontSize: "0.78rem" }}>
                {SOURCE_LABEL[current.source] ?? current.source} - version {current.version}
                {current.note ? ` - ${current.note}` : ""}
              </div>
            </>
          ) : (
            <StatusBadge status="pending" label="À renseigner" controlId="SELLER_FACT_MISSING" />
          )}
          {requirement.help && !current ? <p className="dp-muted" style={{ fontSize: "0.82rem", margin: "4px 0 0" }}>{requirement.help}</p> : null}
        </div>
        {!readOnly && !open ? (
          <Button controlId="SELLER_FACT_EDIT" variant={current ? "ghost" : "secondary"} onClick={() => setOpen(true)}>
            {current ? "Corriger" : "Renseigner"}
          </Button>
        ) : null}
      </div>

      {open ? (
        <form onSubmit={submit} style={{ marginTop: 12 }} noValidate>
          {error ? <StateBanner tone="danger" title="Refusé" controlId="SELLER_FACT_ERROR">{error}</StateBanner> : null}
          {requirement.periodic ? (
            <Field id={`${id}-period`} label="Exercice concerné">
              <Input id={`${id}-period`} required maxLength={16} value={period} onChange={(e) => setPeriod(e.target.value)} data-control-id="SELLER_FACT_PERIOD" />
            </Field>
          ) : null}
          <Field
            id={id}
            label={requirement.amount ? `${requirement.label} en FCFA` : requirement.label}
            hint={requirement.amount ? "Montant entier, sans décimale ni séparateur." : requirement.help}
          >
            {requirement.amount ? (
              <Input id={id} inputMode="numeric" required value={value} onChange={(e) => setValue(e.target.value)} data-control-id="SELLER_FACT_VALUE" />
            ) : (
              <Textarea id={id} rows={3} required value={value} onChange={(e) => setValue(e.target.value)} data-control-id="SELLER_FACT_VALUE" />
            )}
          </Field>
          <Field id={`${id}-note`} label="Justification du retraitement ou de la correction (facultatif)" hint="Enregistrée avec la valeur. Elle explique l'écart avec une pièce justificative.">
            <Textarea id={`${id}-note`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} data-control-id="SELLER_FACT_NOTE" />
          </Field>
          <Actions>
            <Button controlId="SELLER_FACT_SUBMIT" type="submit" state={busy ? "loading" : "default"}>
              Enregistrer
            </Button>
            <Button controlId="SELLER_FACT_CANCEL" type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            {current ? (
              <a className="dp-btn dp-btn-ghost" href={`/cedant/${dealId}/historique?champ=${requirement.key}`} data-control-id="SELLER_FACT_HISTORY">
                Voir l'historique
              </a>
            ) : null}
          </Actions>
        </form>
      ) : null}
    </div>
  );
}
