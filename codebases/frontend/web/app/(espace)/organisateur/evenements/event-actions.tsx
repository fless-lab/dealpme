"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button,Field,Input,StateBanner } from "@dealpme/ui";
export function EventActions({eventId,status}:{eventId:string;status:string}) {
  const router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[reason,setReason]=useState("");
  async function act(action:string){if(busy)return;setBusy(true);setError(null);try{const r=await fetch(`/api/organisateur/events/${eventId}/${action}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason})});const d=await r.json() as {ok:boolean;message?:string};if(!d.ok)setError(d.message??"Action impossible");router.refresh();}catch{setError("Connexion interrompue. Actualisez l'état avant de réessayer.");}finally{setBusy(false);}}
  return <div className="dp-stack">{error?<StateBanner tone="danger" title="Action non confirmée" controlId="ORG_EVENT_ACTION_ERROR">{error}</StateBanner>:null}<div className="dp-actions">
    {["DRAFT","SYNC_UNKNOWN","PUBLISHING"].includes(status)?<Button controlId="ORG_EVENT_PUBLISH" state={busy?"loading":"default"} onClick={()=>act("publish")}>{status==="DRAFT"?"Publier l'événement":"Rapprocher / reprendre la publication"}</Button>:null}
    {status==="PUBLISHED"?<><Button controlId="ORG_EVENT_SYNC" variant="secondary" state={busy?"loading":"default"} onClick={()=>act("sync-attendance")}>Synchroniser les présences</Button><a href={`/evenements/${eventId}/acces`} target="_blank" rel="noreferrer" className="dp-btn dp-btn-secondary" data-control-id="ORG_EVENT_JOIN">Entrer dans la salle (nouvel onglet)</a></>:null}
    <Button controlId="ORG_EVENT_REFRESH" variant="ghost" onClick={()=>router.refresh()}>Actualiser l'état</Button>
  </div>{!["CANCELLED","CLOSED"].includes(status)?<div><Field id="cancel-reason" label="Motif d'annulation"><Input id="cancel-reason" minLength={3} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></Field><Button controlId="ORG_EVENT_CANCEL" variant="secondary" disabled={reason.trim().length<3||busy} onClick={()=>act("cancel")}>{status==="CANCEL_PENDING"?"Rapprocher l'annulation":"Annuler l'événement"}</Button></div>:null}</div>;
}
