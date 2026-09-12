"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Checkbox, Field, Input, StateBanner } from "@dealpme/ui";

export function AppointmentForm({ providerEmailRequired = false }: { providerEmailRequired?: boolean }) {
  const router = useRouter();
  const request=useRef<{body:string;id:string}|null>(null);
  const [slot, setSlot] = useState(""), [ack, setAck] = useState(false), [providerConsent, setProviderConsent] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [done, setDone] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError(null); setDone(false);
    try {
      const body={requestedSlot:`${slot}:00Z`,crossBorderNoticeAcknowledged:ack,providerConsent};
      const serialized=JSON.stringify(body);if(request.current?.body!==serialized)request.current={body:serialized,id:crypto.randomUUID()};
      const r = await fetch("/api/diaspora", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({...body,requestId:request.current.id}) });
      const d = await r.json() as { ok: boolean; message?: string };
      if (!d.ok) { setError(d.message ?? "Demande impossible"); return; }
      setDone(true); router.refresh();
    } catch { setError("Connexion interrompue. Actualisez vos demandes avant de recommencer."); }
    finally { setBusy(false); }
  }
  return <form className="dp-stack" onSubmit={submit}>
    {error ? <StateBanner tone="danger" title="Demande non confirmée" controlId="DIA_ERROR">{error}</StateBanner> : null}
    {done ? <StateBanner tone="success" title="Demande enregistrée">Un officier doit confirmer le créneau avant l&apos;accès à l&apos;entretien.</StateBanner> : null}
    <Field id="appointment-slot" label="Créneau souhaité — heure du Togo (UTC)"><Input id="appointment-slot" data-control-id="DIA_SLOT" type="datetime-local" required value={slot} onChange={e => setSlot(e.target.value)} /></Field>
    <StateBanner tone="info" title="Avis transfrontalier">Les transferts, le change et les obligations fiscales dépendent de votre situation et des pays concernés. Faites vérifier ces points par votre banque et vos conseils. Cet entretien ne vaut pas validation réglementaire ni conseil de change.</StateBanner>
    <Checkbox id="cross-border" data-control-id="DIA_NOTICE" label="J'ai pris connaissance de cet avis transfrontalier." checked={ack} onChange={e => setAck(e.target.checked)} />
    {providerEmailRequired ? <Checkbox id="diaspora-provider" data-control-id="DIA_PROVIDER_CONSENT" label="J'autorise l'envoi de mon email vérifié à Remo pour l'invitation et la connexion à l'entretien." checked={providerConsent} onChange={e => setProviderConsent(e.target.checked)} /> : null}
    <Button type="submit" controlId="DIA_REQUEST" disabled={!ack || busy || (providerEmailRequired && !providerConsent)} state={busy ? "loading" : "default"}>Demander un entretien de 30 minutes</Button>
  </form>;
}
