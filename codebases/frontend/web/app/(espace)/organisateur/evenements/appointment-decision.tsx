"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button,Field,Input,StateBanner } from "@dealpme/ui";
export function AppointmentDecision({id,status,initialReason=""}:{id:string;status:string;initialReason?:string}){
  const router=useRouter(),[reason,setReason]=useState(initialReason),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  async function submit(decision:string){setBusy(true);setError(null);try{const r=await fetch(`/api/organisateur/events/diaspora/${id}/decision`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({decision,reason})});const d=await r.json() as {ok:boolean;message?:string};if(!d.ok)setError(d.message??"Décision non confirmée");router.refresh();}catch{setError("Connexion interrompue ; actualisez avant de reprendre.");}finally{setBusy(false);}}
  return <div>{error?<StateBanner tone="danger" title="Instruction interrompue">{error}</StateBanner>:null}<Field id={`reason-${id}`} label="Motif de la décision humaine"><Input id={`reason-${id}`} value={reason} onChange={e=>setReason(e.target.value)} maxLength={2000}/></Field><div className="dp-actions"><Button controlId="DIA_CONFIRM" disabled={busy||reason.trim().length<3} onClick={()=>submit("CONFIRM")}>{status==="CONFIRMING"?"Reprendre la préparation":"Confirmer et préparer l'entretien"}</Button>{status==="REQUESTED"?<Button controlId="DIA_REFUSE" variant="secondary" disabled={busy||reason.trim().length<3} onClick={()=>submit("REFUSE")}>Refuser avec motif</Button>:null}</div></div>;
}
