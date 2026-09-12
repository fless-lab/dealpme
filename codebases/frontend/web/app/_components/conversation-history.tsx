"use client";

import { Actions, Button, Panel, StateBanner } from "@dealpme/ui";
import { useMessageThread } from "../../lib/use-message-thread";

export function ConversationHistory({ thread, otherParty, controlId }: { thread: ReturnType<typeof useMessageThread>; otherParty: string; controlId: string }) {
  return <>
    {thread.loading ? <p role="status">Chargement des échanges…</p> : null}
    <div className="dp-stack" style={{ gap: 8, marginBottom: 16 }} aria-live="polite">
      {thread.items.map((m) => <div key={m.id} data-control-id={controlId} style={{ padding: 12, borderRadius: 6, border: "1px solid var(--dp-line)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        <div className="dp-label">{m.mine ? "Vous" : otherParty} · {new Date(m.createdAt).toLocaleString("fr-FR")}</div>
        <div>{m.body}</div>
      </div>)}
    </div>
    <Actions>
      <Button controlId="MESSAGE_THREAD_REFRESH" onClick={thread.reload} disabled={thread.busy}>Actualiser les échanges</Button>
      {thread.nextCursor ? <Button controlId="MESSAGE_THREAD_OLDER" onClick={() => void thread.older()} disabled={thread.busy || thread.loading}>Messages précédents</Button> : null}
    </Actions>
  </>;
}

/** Aucun rattachement implicite : l'historique ambigu reste consultable, sans formulaire d'envoi. */
export function LegacyMessages({ dealId }: { dealId: string }) {
  const thread = useMessageThread(dealId, undefined, true);
  if (!thread.error && (thread.loading || !thread.legacyCount)) return null;
  return <Panel title="Historique non attribué — lecture seule">
    <p>Ces anciens messages n'ont pas de destinataire explicite. Ils sont conservés sans être redistribués à un repreneur.</p>
    {thread.error ? <StateBanner tone="danger" title="Historique indisponible">{thread.error}</StateBanner> : null}
    <ConversationHistory thread={thread} otherParty="Auteur historique" controlId="MESSAGE_LEGACY_ROW" />
  </Panel>;
}
