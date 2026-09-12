"use client";
import { useState } from "react";
import { Button, Field, Input, Select, StateBanner } from "@dealpme/ui";
export function MemberGroup({ eventId, registrations }: { eventId: string; registrations: { id: string; displayName: string; invitationState: string }[] }) {
  const available = registrations.filter(r => r.invitationState === "SENT");
  const [registrationId, setRegistrationId] = useState(""), [code, setCode] = useState(""), [message, setMessage] = useState<string | null>(null), [busy, setBusy] = useState(false);
  async function submit(add: boolean) {
    setBusy(true); setMessage(null);
    try { const r = await fetch(`/api/organisateur/events/${eventId}/member-group`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registrationId, code, add }) }); const data = await r.json() as { ok: boolean; message?: string }; setMessage(data.ok ? "Association au groupe confirmée par Remo." : data.message ?? "Association non confirmée."); }
    catch { setMessage("Connexion interrompue : actualisez avant de réessayer."); } finally { setBusy(false); }
  }
  async function speaker() {
    setBusy(true); setMessage(null);
    try { const r = await fetch(`/api/organisateur/events/${eventId}/invite-speaker`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registrationId }) }); const data = await r.json() as { ok: boolean; message?: string }; setMessage(data.ok ? "Invitation comme intervenant confirmée par Remo." : data.message ?? "Invitation non confirmée."); }
    catch { setMessage("Connexion interrompue ; rapprochez l'invitation avant un nouvel envoi."); } finally { setBusy(false); }
  }
  return <div className="dp-stack"><p>Associer un inscrit invité à un groupe Remo existant. Retirer un groupe ne supprime pas son inscription à l&apos;événement.</p>{message ? <StateBanner tone="info" title="Résultat fournisseur">{message}</StateBanner> : null}<Field id="group-registration" label="Participant invité"><Select id="group-registration" value={registrationId} onChange={e => setRegistrationId(e.target.value)}><option value="">Choisir un participant</option>{available.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}</Select></Field><Button controlId="REMO_INVITE_SPEAKER" variant="secondary" disabled={busy || !registrationId} onClick={speaker}>Inviter comme intervenant (email Remo)</Button><Field id="group-code" label="Code du groupe existant dans Remo"><Input id="group-code" value={code} maxLength={200} onChange={e => setCode(e.target.value)} /></Field><div className="dp-actions"><Button controlId="REMO_GROUP_ADD" disabled={busy || !registrationId || !code} onClick={() => submit(true)}>Ajouter au groupe</Button><Button controlId="REMO_GROUP_REMOVE" variant="secondary" disabled={busy || !registrationId || !code} onClick={() => submit(false)}>Retirer du groupe</Button></div></div>;
}
