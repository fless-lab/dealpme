"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Actions, Button, Field, Panel, StateBanner, Textarea } from "@dealpme/ui";

interface Message {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

/** Réponse du cédant aux repreneurs. Texte seul, mêmes règles que côté repreneur. */
export function SellerThread({ dealId }: { dealId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/marketplace/threads/${dealId}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: Message[] }) => {
        if (!cancelled && d.items) setMessages(d.items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/marketplace/deals/${dealId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (data.ok) {
      setMessages((m) => [...m, { id: crypto.randomUUID(), body, createdAt: new Date().toISOString(), mine: true }]);
      setBody("");
      return;
    }
    setError(data.message ?? "Message refusé.");
  }

  return (
    <Panel title="Échanges" controlId="SELLER_THREAD">
      {error ? <StateBanner tone="danger" title="Message refusé" controlId="SELLER_THREAD_ERROR">{error}</StateBanner> : null}
      {messages.length === 0 ? (
        <StateBanner tone="info" title="Aucun échange pour le moment" controlId="SELLER_THREAD_EMPTY" />
      ) : (
        <div className="dp-stack" style={{ gap: 8, marginBottom: 16 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ padding: 12, borderRadius: 6, background: m.mine ? "var(--dp-canvas)" : "var(--dp-paper)", border: "1px solid var(--dp-line)" }} data-control-id="SELLER_MESSAGE">
              <div className="dp-label">{m.mine ? "Vous" : "Un repreneur"}</div>
              <div>{m.body}</div>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={send} noValidate>
        <Field id="seller-message" label="Répondre" hint="Texte seul. Ni pièce jointe, ni coordonnées directes avant l'accord de confidentialité.">
          <Textarea id="seller-message" rows={3} required value={body} onChange={(e) => setBody(e.target.value)} data-control-id="SELLER_MESSAGE_BODY" />
        </Field>
        <Actions>
          <Button controlId="SELLER_MESSAGE_SEND" type="submit" state={busy ? "loading" : "default"}>
            Envoyer
          </Button>
        </Actions>
      </form>
    </Panel>
  );
}
