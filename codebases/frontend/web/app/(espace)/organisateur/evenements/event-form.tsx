"use client";
import { useRef,useState,type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Actions,Button,Field,Input,Select,StateBanner } from "@dealpme/ui";
import type { ManagedEvent } from "../../../../lib/events";
export function EventForm({event}:{event?:ManagedEvent}) {
  const router=useRouter(),key=useRef<{body:string;id:string}|null>(null);
  const [form,setForm]=useState({title:event?.title??"",description:event?.description??"",startsAt:event?.startsAt.slice(0,16)??"",endsAt:event?.endsAt.slice(0,16)??"",capacity:String(event?.capacity??100),campaignId:event?.campaignId??"",label:event?.branding.label??"DealPME",accent:event?.branding.accent??"#1C2751",welcome:event?.branding.welcome??"Bienvenue à cette rencontre"});
  const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  const [brandingSource,setBrandingSource]=useState(event?.brandingOrigin.scope??"ACCOUNT");
  const set=(name:keyof typeof form,value:string)=>setForm(f=>({...f,[name]:value}));
  async function submit(e:FormEvent) {
    e.preventDefault();if(busy)return;setBusy(true);setError(null);
    try {
      const body={title:form.title,description:form.description,startsAt:`${form.startsAt}:00Z`,endsAt:`${form.endsAt}:00Z`,capacity:Number(form.capacity),campaignId:form.campaignId,brandingSource,branding:{label:form.label,accent:form.accent,welcome:form.welcome},...(event?{expectedRevision:event.revision}:{})};
      const serialized=JSON.stringify(body); if(key.current?.body!==serialized)key.current={body:serialized,id:crypto.randomUUID()};
      const response=await fetch(`/api/organisateur/events${event?`/${event.id}/edit`:""}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...body,...(!event?{requestId:key.current.id}:{})})});
      const result=await response.json() as {ok:boolean;message?:string;eventId?:string};
      if(!result.ok){setError(result.message??"Enregistrement impossible");return;}
      router.push(`/organisateur/evenements/${result.eventId}`);router.refresh();
    } catch {setError("Connexion interrompue. Vos saisies sont conservées ; réessayez.");} finally {setBusy(false);}
  }
  return <form onSubmit={submit} className="dp-stack">
    {error?<StateBanner tone="danger" title="Événement non enregistré" controlId="ORG_EVENT_ERROR">{error}</StateBanner>:null}
    <Field id="event-title" label="Titre"><Input id="event-title" data-control-id="ORG_EVENT_TITLE" required minLength={3} maxLength={200} value={form.title} onChange={e=>set("title",e.target.value)}/></Field>
    <Field id="event-description" label="Description"><textarea id="event-description" className="dp-input" rows={3} maxLength={4000} value={form.description} onChange={e=>set("description",e.target.value)}/></Field>
    <div className="dp-grid"><Field id="event-start" label="Début — heure du Togo (UTC)"><Input id="event-start" data-control-id="ORG_EVENT_START" type="datetime-local" required value={form.startsAt} onChange={e=>set("startsAt",e.target.value)}/></Field><Field id="event-end" label="Fin — heure du Togo (UTC)"><Input id="event-end" data-control-id="ORG_EVENT_END" type="datetime-local" required value={form.endsAt} onChange={e=>set("endsAt",e.target.value)}/></Field></div>
    <div className="dp-grid"><Field id="event-capacity" label="Places participantes"><Input id="event-capacity" data-control-id="ORG_EVENT_CAPACITY" type="number" min={1} max={5000} required value={form.capacity} onChange={e=>set("capacity",e.target.value)}/></Field><Field id="event-campaign" label="Campagne d'attribution"><Input id="event-campaign" maxLength={64} value={form.campaignId} onChange={e=>set("campaignId",e.target.value)}/></Field></div>
    <Field id="branding-source" label="Profil de marque"><Select id="branding-source" data-control-id="ORG_BRAND_SOURCE" value={brandingSource} onChange={e=>setBrandingSource(e.target.value as "ACCOUNT"|"EVENT")}><option value="ACCOUNT">Hériter du profil général configuré</option><option value="EVENT">Personnaliser cet événement uniquement</option></Select></Field>
    {brandingSource==="EVENT"?<fieldset className="dp-stack"><legend>Identité de cet événement</legend><Field id="event-brand" label="Marque affichée"><Input id="event-brand" data-control-id="ORG_EVENT_BRAND" required maxLength={100} value={form.label} onChange={e=>set("label",e.target.value)}/></Field><Field id="event-accent" label="Couleur d'accent"><Input id="event-accent" type="color" value={form.accent} onChange={e=>set("accent",e.target.value)}/></Field><Field id="event-welcome" label="Message de bienvenue"><Input id="event-welcome" maxLength={300} value={form.welcome} onChange={e=>set("welcome",e.target.value)}/></Field></fieldset>:<p>Le profil général est copié et sa version conservée à l'enregistrement. Une modification globale ne réécrit pas les événements déjà préparés ou publiés.</p>}
    <p className="dp-muted">Inscription portée par DealPME. Le brouillon ne réserve pas de créneau ; la publication vérifie le compte partagé. Les modifications de planning se font avant publication.</p>
    <Actions><Button type="submit" controlId="ORG_EVENT_SAVE" state={busy?"loading":"default"}>{event?"Enregistrer les modifications":"Créer le brouillon"}</Button><a href="/organisateur/evenements" className="dp-btn dp-btn-secondary">Retour aux événements</a></Actions>
  </form>;
}
