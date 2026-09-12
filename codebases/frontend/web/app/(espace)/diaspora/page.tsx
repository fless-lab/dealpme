import { Panel } from "@dealpme/ui";
import { api } from "../../../lib/api";
import { requireRole,fmtDateTime } from "../../../lib/guards";
import { APPOINTMENT_STATE,type Appointment } from "../../../lib/events";
import { AppointmentForm } from "./request-form";
export const metadata={title:"Guichet Diaspora"};
export default async function Diaspora(){const {token}=await requireRole("INVESTOR","INVESTOR_DIASPORA");const {items}=await api<{items:Appointment[]}>("/events/diaspora/appointments",{token});return <div className="dp-stack"><h1>Guichet Diaspora</h1><p className="dp-muted">Un rendez-vous privé, confirmé par un officier. L'entretien n'apparaît pas dans les événements publics.</p><Panel title="Proposer un créneau"><AppointmentForm/></Panel><Panel title="Vos demandes">{items.length?<ul className="dp-stack">{items.map(a=><li key={a.id}><strong>{fmtDateTime(a.requestedSlot)}</strong> · {APPOINTMENT_STATE[a.status]??a.status}{a.decisionReason?<p>{a.decisionReason}</p>:null}{a.status==="CONFIRMED"&&a.eventId?<a href={`/evenements/${a.eventId}/acces`} target="_blank" rel="noreferrer" data-control-id="DIA_JOIN">Accéder à l'entretien (nouvel onglet)</a>:null}</li>)}</ul>:<p>Aucune demande enregistrée.</p>}</Panel></div>;}
