import { Panel, StateBanner } from "@dealpme/ui";
import { api, messageFor } from "../../../../lib/api";
import { requireRole, fmtDateTime } from "../../../../lib/guards";
import { EVENT_STATE, APPOINTMENT_STATE, type ManagedEvent, type Appointment } from "../../../../lib/events";
import { AppointmentDecision } from "./appointment-decision";
import { EventPageLinks } from "./page-links";
export const metadata = { title: "Console organisateur" };
type Params = { cursor?: string; appointmentsCursor?: string };
export default async function OrganiserEvents({searchParams}:{searchParams:Promise<Params>}) {
  const {token,me}=await requireRole("CCI_OFFICER","PLATFORM_ADMIN"),params=await searchParams;
  try {
    if(Object.values(params).some(v=>typeof v!=="string"))throw new Error("Pagination invalide");
    const [data,diaspora]=await Promise.all([
      api<{items:ManagedEvent[];nextCursor:string|null;provider:string;account:{key:string;concurrentLimit:number;marginMinutes:number}}>(`/events/managed?${new URLSearchParams(params.cursor?{cursor:params.cursor}:{})}`,{token}),
      api<{items:Appointment[];nextCursor:string|null}>(`/events/diaspora/managed?${new URLSearchParams(params.appointmentsCursor?{cursor:params.appointmentsCursor}:{})}`,{token}),
    ]);
    return <div className="dp-stack"><div><p className="dp-kicker">Deal-Connect · organisation</p><h1>Vos événements</h1><p className="dp-muted">Préparer, publier et suivre les rencontres depuis DealPME.</p><a href="/organisateur/evenements/nouveau" className="dp-btn dp-btn-primary" data-control-id="ORG_EVENT_NEW">Créer un événement</a></div>
      <a href="/organisateur/integration" data-control-id="ORG_INTEGRATION">Compte, branding global et SSO Remo</a>
      <StateBanner tone="info" title={data.provider==="local"?"Intégration locale simulée":data.provider==="remo"?"Adaptateur Remo configuré":"Intégration désactivée"}>Les opérations sont pilotées depuis DealPME. La recette du compte réel confirme ses droits, le SSO, les visuels et les quotas.</StateBanner>
      <Panel title="Compte partagé"><p>{data.account.key} : {data.account.concurrentLimit} événements simultanés configurés, marges de {data.account.marginMinutes} minutes. {data.provider==="local"?"Quota de simulation.":null}</p><p>Les créations hors de ce registre ne sont pas recensées automatiquement.</p></Panel>
      <Panel title="Événements gérés">{data.items.length?<div className="dp-tablewrap"><table className="dp-table"><thead><tr><th scope="col">Événement</th><th scope="col">Créneau (Togo)</th><th scope="col">État</th><th scope="col">Audience</th><th scope="col">Action</th></tr></thead><tbody>{data.items.map(e=><tr key={e.id}><td>{e.title}<div className="dp-muted">{e.branding.label}</div></td><td>{fmtDateTime(e.startsAt)}</td><td>{EVENT_STATE[e.status]??e.status}</td><td>{e.audience==="PUBLIC"?"Rencontre publique":"Entretien privé"}</td><td><a href={`/organisateur/evenements/${e.id}`} data-control-id="ORG_EVENT_DETAIL">Gérer</a></td></tr>)}</tbody></table></div>:<p>Aucun événement dans cette page.</p>}
        <EventPageLinks path="/organisateur/evenements" label="Pagination événements" cursor={data.nextCursor} current={!!params.cursor} preserve={params.appointmentsCursor?{appointmentsCursor:params.appointmentsCursor}:{}}/>
      </Panel>
      <Panel title="Guichet Diaspora — demandes à instruire">{diaspora.items.length?<div className="dp-stack">{diaspora.items.map(a=>{
        const mine=!a.confirmedBy||a.confirmedBy===me.userId;
        return <section key={a.id}><h3>Demande {a.id.slice(-8)} · {fmtDateTime(a.requestedSlot)}</h3><p>{APPOINTMENT_STATE[a.status]??a.status}{a.decisionReason?` — ${a.decisionReason}`:""}</p>{mine&&["REQUESTED","CONFIRMING"].includes(a.status)?<AppointmentDecision id={a.id} status={a.status} initialReason={a.decisionReason??""}/>:null}{mine&&a.eventId?<a href={`/organisateur/evenements/${a.eventId}`}>Consulter la salle attribuée</a>:null}{!mine?<p>Instruction attribuée à un autre officier.</p>:null}</section>;
      })}</div>:<p>Aucune demande dans cette page.</p>}
        <EventPageLinks path="/organisateur/evenements" label="Pagination file diaspora" cursor={diaspora.nextCursor} current={!!params.appointmentsCursor} parameter="appointmentsCursor" preserve={params.cursor?{cursor:params.cursor}:{}}/>
      </Panel>
    </div>;
  } catch(error) {
    return <div className="dp-stack"><h1>Vos événements</h1><StateBanner tone="warning" title="Listes indisponibles" controlId="L05_LIST_ERROR">{messageFor(error)}</StateBanner><a href="/organisateur/evenements">Revenir à la première page</a></div>;
  }
}
