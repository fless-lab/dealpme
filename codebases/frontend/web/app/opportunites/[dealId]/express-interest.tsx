"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Actions, Button, Field, Panel, StateBanner, Textarea } from "@dealpme/ui";

interface Message {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

/**
 * Manifestation d'intérêt puis échange avec le cédant. La messagerie est du texte seul : pas de pièce jointe
 * avant accord de confidentialité, et les coordonnées directes sont refusées par le serveur en disant pourquoi.
 */
export function ExpressInterest({ dealId, isShare, alreadyInterested }: { dealId: string; isShare: boolean; alreadyInterested: boolean }) {
  const router = useRouter();
  const [interested, setInterested] = useState(alreadyInterested);
  const [messages, setMessages] = useState<Message[]>([]);
  const [note, setNote] = useState("");
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

  async function express(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/marketplace/deals/${dealId}/interests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: note || null }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (data.ok) {
      setInterested(true);
      setNote("");
      router.refresh();
      return;
    }
    setError(data.message ?? "Envoi impossible.");
  }

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

  if (isShare) {
    return (
      <StateBanner tone="warning" title="Manifestation d'intérêt indisponible" controlId="OPP_INTEREST_BLOCKED">
        Pour une cession de titres, l'accès passe par une admission nominative prononcée par le service de conformité.
        Le formulaire d'intérêt libre n'existe pas : ce serait une diffusion au-delà du cercle autorisé.
      </StateBanner>
    );
  }

  return (
    <Panel title={interested ? "Votre échange avec le cédant" : "Manifester votre intérêt"} controlId="OPP_INTEREST">
      {error ? <StateBanner tone="danger" title="Refusé" controlId="OPP_INTEREST_ERROR">{error}</StateBanner> : null}

      {!interested ? (
        <form onSubmit={express} noValidate>
          <p style={{ marginTop: 0 }}>
            Le cédant reçoit votre manifestation d'intérêt et décide de vous qualifier. Votre identité ne lui est pas
            communiquée à ce stade, et aucune donnée de l'entreprise ne vous est ouverte tant qu'il n'a pas décidé.
          </p>
          <Field id="interest-note" label="Message d'accompagnement (facultatif)" hint="Votre thèse de reprise en quelques lignes. Sans coordonnées directes : elles s'échangent après l'accord de confidentialité.">
            <Textarea id="interest-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} data-control-id="OPP_INTEREST_NOTE" />
          </Field>
          <Actions>
            <Button controlId="EXPRESS_INTEREST" type="submit" state={busy ? "loading" : "default"}>
              Manifester mon intérêt
            </Button>
          </Actions>
        </form>
      ) : (
        <>
          <div className="dp-stack" style={{ gap: 8, marginBottom: 16 }}>
            {messages.length === 0 ? (
              <p className="dp-muted" style={{ margin: 0 }}>Intérêt transmis. Écrivez au cédant pour convenir d'un échange.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} style={{ padding: 12, borderRadius: 6, background: m.mine ? "var(--dp-canvas)" : "var(--dp-paper)", border: "1px solid var(--dp-line)" }} data-control-id="OPP_MESSAGE">
                  <div className="dp-label">{m.mine ? "Vous" : "Le cédant"}</div>
                  <div>{m.body}</div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={send} noValidate>
            <Field id="message-body" label="Message" hint="Texte seul. Ni pièce jointe, ni téléphone, ni email tant que l'accord de confidentialité n'est pas signé.">
              <Textarea id="message-body" rows={3} required value={body} onChange={(e) => setBody(e.target.value)} data-control-id="OPP_MESSAGE_BODY" />
            </Field>
            <Actions>
              <Button controlId="CONTACT_SELLER" type="submit" state={busy ? "loading" : "default"}>
                Envoyer
              </Button>
            </Actions>
          </form>
        </>
      )}
    </Panel>
  );
}
