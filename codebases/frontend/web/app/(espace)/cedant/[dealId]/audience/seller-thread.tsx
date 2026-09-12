"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ConversationSummary } from "@dealpme/contracts";
import { Actions, Button, Field, Panel, Select, StateBanner, Textarea } from "@dealpme/ui";
import { useMessageThread } from "../../../../../lib/use-message-thread";
import { ConversationHistory, LegacyMessages } from "../../../../_components/conversation-history";

export function SellerThread({ dealId }: { dealId: string }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [target, setTarget] = useState("");
  const [body, setBody] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [listRevision, setListRevision] = useState(0);
  const thread = useMessageThread(dealId, target || undefined);

  useEffect(() => {
    const controller = new AbortController();
    setListError(null);
    void fetch(`/api/marketplace/conversations/${dealId}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.message ?? "Liste indisponible");
      if (!controller.signal.aborted) setConversations(data.items);
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setListError(cause instanceof Error ? cause.message : "Liste indisponible"); });
    return () => controller.abort();
  }, [dealId, listRevision]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (target && await thread.send(body)) setBody("");
  }

  return <>
    <Panel title="Échanges" controlId="SELLER_THREAD">
      {listError || thread.error ? <StateBanner tone="danger" title="Échange indisponible" controlId="SELLER_THREAD_ERROR">{listError ?? thread.error}</StateBanner> : null}
      <Field id="seller-conversation" label="Conversation du repreneur" hint="La référence correspond à la colonne Conversation des manifestations d'intérêt. L'identité reste masquée.">
        <Select id="seller-conversation" value={target} disabled={thread.busy} onChange={(e) => { setTarget(e.target.value); setBody(""); }} data-control-id="SELLER_CONVERSATION_SELECT">
          <option value="">Choisir une conversation</option>
          {conversations.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </Select>
      </Field>
      <Button controlId="SELLER_CONVERSATIONS_REFRESH" onClick={() => setListRevision((v) => v + 1)}>Actualiser les destinataires</Button>
      {!listError && !thread.error && !thread.loading && !thread.items.length ? <StateBanner tone="info" title={target ? "Aucun message dans cette conversation" : "Sélectionnez un repreneur pour ouvrir son échange"} controlId="SELLER_THREAD_EMPTY" /> : null}
      <ConversationHistory thread={thread} otherParty="Le repreneur" controlId="SELLER_MESSAGE" />
      <form onSubmit={send}>
        <Field id="seller-message" label="Répondre" hint="Texte seul. Ni pièce jointe, ni coordonnées directes avant l'accord de confidentialité.">
          <Textarea id="seller-message" rows={3} required minLength={2} maxLength={4000} disabled={!target || thread.busy || thread.loading} value={body} onChange={(e) => setBody(e.target.value)} data-control-id="SELLER_MESSAGE_BODY" />
        </Field>
        <Actions><Button controlId="SELLER_MESSAGE_SEND" type="submit" disabled={!target || thread.loading} state={thread.busy ? "loading" : "default"}>Envoyer</Button></Actions>
      </form>
    </Panel>
    <LegacyMessages dealId={dealId} />
  </>;
}
