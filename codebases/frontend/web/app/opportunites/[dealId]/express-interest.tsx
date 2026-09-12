"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Field, Panel, StateBanner, Textarea } from "@dealpme/ui";

import { useMessageThread } from "../../../lib/use-message-thread";
import { ConversationHistory, LegacyMessages } from "../../_components/conversation-history";

/**
 * Manifestation d'intérêt puis échange avec le cédant. La messagerie est du texte seul : pas de pièce jointe
 * avant accord de confidentialité, et les coordonnées directes sont refusées par le serveur en disant pourquoi.
 */
export function ExpressInterest({ dealId, isShare, alreadyInterested }: { dealId: string; isShare: boolean; alreadyInterested: boolean }) {
  const router = useRouter();
  const [interested, setInterested] = useState(alreadyInterested);
  const thread = useMessageThread(dealId);
  const [note, setNote] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function express(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
    const res = await fetch(`/api/marketplace/deals/${dealId}/interests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: note || null }),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (data.ok) {
      setInterested(true);
      setNote("");
      thread.reload();
      router.refresh();
      return;
    }
    setError(data.message ?? "Envoi impossible.");
    } catch { setError("Envoi non confirmé. Actualisez la page avant de réessayer."); }
    finally { setBusy(false); }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (await thread.send(body)) setBody("");
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
      {error || thread.error ? <StateBanner tone="danger" title="Échange indisponible" controlId="OPP_INTEREST_ERROR">{error ?? thread.error}</StateBanner> : null}

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
          {!thread.loading && !thread.error && !thread.items.length ? <p className="dp-muted">Intérêt transmis. Écrivez au cédant pour convenir d'un échange.</p> : null}
          <ConversationHistory thread={thread} otherParty="Le cédant" controlId="OPP_MESSAGE" />
          <form onSubmit={send}>
            <Field id="message-body" label="Message" hint="Texte seul. Ni pièce jointe, ni téléphone, ni email tant que l'accord de confidentialité n'est pas signé.">
              <Textarea id="message-body" rows={3} required minLength={2} maxLength={4000} disabled={thread.busy || thread.loading} value={body} onChange={(e) => setBody(e.target.value)} data-control-id="OPP_MESSAGE_BODY" />
            </Field>
            <Actions>
              <Button controlId="CONTACT_SELLER" type="submit" disabled={thread.loading} state={thread.busy ? "loading" : "default"}>
                Envoyer
              </Button>
            </Actions>
          </form>
          <LegacyMessages dealId={dealId} />
        </>
      )}
    </Panel>
  );
}
