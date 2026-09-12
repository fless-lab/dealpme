import { Panel,StateBanner } from "@dealpme/ui";
import { api } from "../../../../lib/api";
import { requireRole,fmtDateTime } from "../../../../lib/guards";
import { EVENT_STATE,APPOINTMENT_STATE,type ManagedEvent,type Appointment } from "../../../../lib/events";
import { AppointmentDecision } from "./appointment-decision";
export const metadata={title:"Console organisateur"};
export default async function OrganiserEvents(){
  const {token}=await requireRole("CCI_OFFICER","PLATFORM_ADMIN");
  const [data,diaspora]=await Promise.all([api<{items:ManagedEvent[];provider:string;account:{key:string;concurrentLimit:number;marginMinutes:number}}>("/events/managed",{token}),api<{items:Appointment[]}>("/events/diaspora/managed",{token})]);
  return <div className="dp-stack"><div><p className="dp-kicker">Deal-Connect · organisation</p><h1>Vos événements</h1><p className="dp-muted">Préparer, publier et suivre les rencontres depuis DealPME.</p><a href="/organisateur/evenements/nouveau" className="dp-btn dp-btn-primary" data-control-id="ORG_EVENT_NEW">Créer un événement</a></div>
    <StateBanner tone="info" title={data.provider==="local"?"Intégration locale simulée":"Intégration en attente de qualification"}>La salle locale permet la recette. Les droits API, le branding et les quotas du compte Remo réel restent à qualifier.</StateBanner>
    <Panel title="Compte partagé"><p>Référence : {data.account.key}. Limite de simulation : <strong>{data.account.concurrentLimit} événements simultanés</strong>, avec {data.account.marginMinutes} minutes de marge de chaque côté.</p><p className="dp-muted">Ce registre couvre les réservations qui y passent. Les événements créés directement chez le fournisseur ne sont pas recensés automatiquement.</p></Panel>
    <Panel title="Événements gérés">{data.items.length?<div className="dp-tablewrap"><table className="dp-table"><thead><tr><th scope="col">Événement</th><th scope="col">Créneau (Togo)</th><th scope="col">État</th><th scope="col">Audience</th><th scope="col">Action</th></tr></thead><tbody>{data.items.map(e=><tr key={e.id}><td>{e.title}<div className="dp-muted">{e.branding.label}</div></td><td>{fmtDateTime(e.startsAt)}</td><td>{EVENT_STATE[e.status]??e.status}</td><td>{e.audience==="PUBLIC"?"Rencontre publique":"Entretien privé"}</td><td><a href={`/organisateur/evenements/${e.id}`} data-control-id="ORG_EVENT_DETAIL">Gérer</a></td></tr>)}</tbody></table></div>:<p>Aucun événement dans votre espace. Commencez par un brouillon.</p>}</Panel>
    <Panel title="Guichet Diaspora — demandes à instruire">{diaspora.items.length?<div className="dp-stack">{diaspora.items.map(a=><section key={a.id}><h3>Demande {a.id.slice(-8)} · {fmtDateTime(a.requestedSlot)}</h3><p>{APPOINTMENT_STATE[a.status]??a.status}{a.decisionReason?` — ${a.decisionReason}`:""}</p>{["REQUESTED","CONFIRMING"].includes(a.status)?<AppointmentDecision id={a.id} status={a.status}/>:null}{a.eventId?<a href={`/organisateur/evenements/${a.eventId}`}>Consulter la salle attribuée</a>:null}</section>)}</div>:<p>Aucune demande pour le moment.</p>}</Panel>
  </div>;
}
