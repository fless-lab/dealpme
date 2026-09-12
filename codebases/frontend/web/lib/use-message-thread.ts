"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationMessage, MessagePage, SentMessage } from "@dealpme/contracts";

async function json<T>(url: string, options: RequestInit = {}): Promise<T> {
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  const response = await fetch(url, { ...options, signal }).catch(() => { throw new Error("Service indisponible. Actualisez les échanges avant de réessayer."); });
  const data = await response.json().catch(() => { throw new Error("Réponse non confirmée. Actualisez les échanges avant de réessayer."); });
  if (!response.ok || data.ok === false) throw new Error(typeof data.message === "string" ? data.message : "Échange indisponible");
  return data as T;
}

/** Le serveur choisit les parties. Les générations empêchent une réponse tardive de remplir un autre fil. */
export function useMessageThread(dealId: string, target?: string, legacy = false) {
  const [items, setItems] = useState<ConversationMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [legacyCount, setLegacyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const query = new URLSearchParams({ scope: legacy ? "legacy" : "conversation" });
  if (target) query.set("conversationId", target);
  const url = `/api/marketplace/threads/${dealId}?${query}`;

  useEffect(() => {
    const current = ++generation.current;
    const controller = new AbortController();
    setItems([]); setNextCursor(null); setError(null); setLoading(true); setBusy(false);
    void json<MessagePage>(url, { signal: controller.signal }).then((data) => {
      if (generation.current !== current) return;
      setItems(data.items); setNextCursor(data.nextCursor); setLegacyCount(data.legacyCount);
    }).catch((cause: unknown) => {
      if (generation.current === current) setError(cause instanceof Error ? cause.message : "Chargement impossible");
    }).finally(() => { if (generation.current === current) setLoading(false); });
    return () => { generation.current = current + 1; controller.abort(); };
  }, [url, revision]);

  async function older() {
    if (!nextCursor || busy || loading) return;
    const current = generation.current;
    setBusy(true); setError(null);
    try {
      const data = await json<MessagePage>(`${url}&before=${nextCursor}`);
      if (current !== generation.current) return;
      setItems((previous) => [...new Map([...data.items, ...previous].map((m) => [m.id, m])).values()]);
      setNextCursor(data.nextCursor);
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : "Chargement impossible");
    } finally { if (current === generation.current) setBusy(false); }
  }

  async function send(body: string): Promise<boolean> {
    if (legacy || busy || loading) return false;
    const current = generation.current;
    setBusy(true); setError(null);
    try {
      const data = await json<SentMessage>(`/api/marketplace/deals/${dealId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, ...(target ? { conversationId: target } : {}) }),
      });
      if (current !== generation.current) return false;
      if (!data.message?.id) throw new Error("Envoi non confirmé. Actualisez le fil avant de réessayer.");
      setItems((previous) => [...previous.filter((m) => m.id !== data.message.id), data.message]);
      return true;
    } catch (cause) {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : "Envoi non confirmé. Actualisez le fil avant de réessayer.");
      return false;
    } finally { if (current === generation.current) setBusy(false); }
  }

  return { items, nextCursor, legacyCount, loading, busy, error, send, older, reload: () => setRevision((v) => v + 1) };
}
