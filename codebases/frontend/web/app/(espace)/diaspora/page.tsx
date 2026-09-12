import { Panel,StateBanner } from "@dealpme/ui";
import { api,messageFor } from "../../../lib/api";
import { requireRole, fmtDateTime } from "../../../lib/guards";
import { APPOINTMENT_STATE, type Appointment } from "../../../lib/events";
import { AppointmentForm } from "./request-form";
import { EventPageLinks } from "../organisateur/evenements/page-links";
export const metadata = { title: "Guichet Diaspora" };
export default async function Diaspora({searchParams}:{searchParams:Promise<{cursor?:string}>}) {
  const {token}=await requireRole("INVESTOR","INVESTOR_DIASPORA"),params=await searchParams;
  try {
    if(params.cursor!==undefined&&typeof params.cursor!=="string")throw new Error("Pagination invalide");
    const [{items,nextCursor},options]=await Promise.all([api<{items:Appointment[];nextCursor:string|null}>(`/events/diaspora/appointments?${new URLSearchParams(params.cursor?{cursor:params.cursor}:{})}`,{token}),api<{providerEmailRequired:boolean}>("/events/options",{token})]);
    return <div className="dp-stack"><h1>Guichet Diaspora</h1><p className="dp-muted">Un rendez-vous privé, confirmé par un officier.</p><Panel title="Proposer un créneau"><AppointmentForm providerEmailRequired={options.providerEmailRequired}/></Panel><Panel title="Vos demandes">{items.length?<ul className="dp-stack">{items.map(a=><li key={a.id}><strong>{fmtDateTime(a.requestedSlot)}</strong> · {APPOINTMENT_STATE[a.status]??a.status}{a.decisionReason?<p>{a.decisionReason}</p>:null}{a.status==="CONFIRMED"&&a.eventId?<a href={`/evenements/${a.eventId}/acces`} target="_blank" rel="noreferrer" data-control-id="DIA_JOIN">Accéder à l&apos;entretien (nouvel onglet)</a>:null}</li>)}</ul>:<p>Aucune demande dans cette page.</p>}<EventPageLinks path="/diaspora" label="Pagination de mes demandes" cursor={nextCursor} current={!!params.cursor}/></Panel></div>;
  } catch(error) {return <div className="dp-stack"><h1>Guichet Diaspora</h1><StateBanner tone="warning" title="Demandes indisponibles" controlId="L05_LIST_ERROR">{messageFor(error)}</StateBanner><a href="/diaspora">Revenir à la première page</a></div>;}
}
