"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, StateBanner } from "@dealpme/ui";
export function EventActions({ eventId, status, provider }: { eventId: string; status: string; provider: string }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [message, setMessage] = useState<string | null>(null), [reason, setReason] = useState(""), [remoteId, setRemoteId] = useState("");
  const [invitationCursor,setInvitationCursor]=useState<string|null>(null);
  const remoteDeletion=provider==="remo"&&!["DRAFT","CREATE_REJECTED"].includes(status);
  async function act(action: string) {
    if (busy) return; setBusy(true); setError(null); setMessage(null);
    try {
      const r = await fetch(`/api/organisateur/events/${eventId}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, remoteId, deleteRemoteData: action === "cancel" && remoteDeletion, ...(action==="sync-invitations"&&invitationCursor?{cursor:invitationCursor}:{}) }) });
      const d = await r.json() as { ok: boolean; message?: string; items?: { invitationState: string }[];nextCursor?:string|null };
      if (!d.ok) setError(d.message ?? "Action impossible");
      else if (d.items) { setInvitationCursor(d.nextCursor??null);setMessage(`${d.items.filter(i => i.invitationState === "SENT").length} invitation(s) confirmée(s), ${d.items.filter(i => i.invitationState !== "SENT").length} à vérifier.${d.nextCursor?" Une page suivante reste à traiter.":" Fin du parcours des inscriptions."}`); }
      router.refresh();
    } catch { setError("Connexion interrompue. Actualisez l'état avant de réessayer."); } finally { setBusy(false); }
  }
  return <div className="dp-stack">
    {error ? <StateBanner tone="danger" title="Action non confirmée" controlId="ORG_EVENT_ACTION_ERROR">{error}</StateBanner> : null}
    {message ? <StateBanner tone="info" title="Synchronisation des invitations">{message}</StateBanner> : null}
    <div className="dp-actions">
      {(["DRAFT","CREATE_REJECTED"].includes(status) || (provider !== "remo" && ["SYNC_UNKNOWN", "PUBLISHING"].includes(status))) ? <Button controlId="ORG_EVENT_PUBLISH" state={busy ? "loading" : "default"} onClick={() => act("publish")}>{status === "DRAFT" ? "Publier l'événement" : status==="CREATE_REJECTED"?"Réessayer la publication":"Rapprocher / reprendre la publication"}</Button> : null}
      {status === "PUBLISHED" ? <><Button controlId="ORG_EVENT_SYNC" variant="secondary" state={busy ? "loading" : "default"} onClick={() => act("sync-attendance")}>Synchroniser les présences</Button>{provider === "remo" ? <Button controlId="ORG_SYNC_INVITATIONS" variant="secondary" disabled={busy} onClick={() => act("sync-invitations")}>{invitationCursor?"Traiter la page suivante d'invitations":"Envoyer / rapprocher les invitations Remo"}</Button> : null}<a href={`/evenements/${eventId}/acces`} target="_blank" rel="noreferrer" className="dp-btn dp-btn-secondary" data-control-id="ORG_EVENT_JOIN">Entrer dans la salle (nouvel onglet)</a></> : null}
      <Button controlId="ORG_EVENT_REFRESH" variant="ghost" onClick={() => router.refresh()}>Actualiser l'état</Button>
    </div>
    {provider === "remo" && ["SYNC_UNKNOWN", "PUBLISHING"].includes(status) ? <div><p>La création Remo n&apos;a pas de garantie de rejeu documentée. Le rapprochement vérifie compte, code de corrélation, titre, créneau et visibilité sans recréer la salle.</p><Field id="remote-reference" label="Identifiant de la salle créée chez Remo"><Input id="remote-reference" value={remoteId} onChange={e => setRemoteId(e.target.value)} maxLength={24} /></Field><Button controlId="ORG_REMOTE_RECONCILE" disabled={busy || !/^[a-f0-9]{24}$/i.test(remoteId)} onClick={() => act("reconcile")}>Vérifier et rattacher la salle</Button></div> : null}
    {!["CANCELLED", "CLOSED"].includes(status) ? <div><Field id="cancel-reason" label={remoteDeletion ? "Motif de suppression de la salle Remo et de ses données" : "Motif d'annulation"}><Input id="cancel-reason" minLength={3} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></Field>{remoteDeletion ? <p>Cette opération utilise DELETE : Remo supprime aussi les données associées, dont les enregistrements. Les traces DealPME sont conservées.</p> : null}<Button controlId="ORG_EVENT_CANCEL" variant="secondary" disabled={reason.trim().length < 3 || busy} onClick={() => act("cancel")}>{remoteDeletion ? "Supprimer la salle Remo et ses données" : status === "CANCEL_PENDING" ? "Rapprocher l'annulation" : "Annuler l'événement"}</Button></div> : null}
  </div>;
}
