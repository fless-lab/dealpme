"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Field, StateBanner, Textarea } from "@dealpme/ui";

/** Dépôt et retrait d'une demande de certification. Le serveur reste juge de la recevabilité. */
export function RequestCertification({ companyId, requestable, open }: { companyId: string; requestable: boolean; open: { id: string; state: string } | null }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<{ label: string; remedy?: string }[]>([]);
  const [busy, setBusy] = useState(false);

  async function post(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    setMissing([]);
    const res = await fetch(`/api/certification/${companyId}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json()) as { ok: boolean; message?: string; details?: { missing?: { label: string; remedy?: string }[] } };
    setBusy(false);
    if (data.ok) {
      router.refresh();
      return;
    }
    setError(data.message ?? "Action impossible.");
    setMissing(data.details?.missing ?? []);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    await post("request", { message: message || null });
  }

  if (open) {
    return (
      <>
        <Actions>
          <Button controlId="SELLER_CERT_WITHDRAW" variant="secondary" state={busy ? "loading" : "default"} onClick={() => post(`${open.id}/withdraw`, {})}>
            Retirer la demande
          </Button>
        </Actions>
        {error ? <StateBanner tone="danger" title="Retrait impossible" controlId="SELLER_CERT_WITHDRAW_ERROR">{error}</StateBanner> : null}
      </>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field id="cert-message" label="Message à la CCI-Togo (facultatif)" hint="Contexte utile à l'instruction : calendrier envisagé, particularité du dossier.">
        <Textarea id="cert-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} data-control-id="SELLER_CERT_MESSAGE" />
      </Field>
      <Actions>
        <Button controlId="SELLER_CERT_REQUEST" type="submit" state={busy ? "loading" : requestable ? "default" : "blocked"} disabled={!requestable}>
          Demander la certification
        </Button>
      </Actions>
      {error ? (
        <StateBanner tone="danger" title="Demande refusée" controlId="SELLER_CERT_REQUEST_ERROR">
          {error}
          {missing.length > 0 ? (
            <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
              {missing.map((m) => (
                <li key={m.label}>
                  <b>{m.label}</b>
                  {m.remedy ? <div>{m.remedy}</div> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </StateBanner>
      ) : null}
    </form>
  );
}
