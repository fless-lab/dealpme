import { notFound } from "next/navigation";
import { Panel,StateBanner } from "@dealpme/ui";
import { api,ApiError } from "../../../../../lib/api";
import { requireRole,fmtDateTime } from "../../../../../lib/guards";
import { EVENT_STATE,type ManagedEvent } from "../../../../../lib/events";
import { EventForm } from "../event-form";
import { EventActions } from "../event-actions";
export default async function EventDetail({params}:{params:Promise<{eventId:string}>}){
  const {eventId}=await params,{token}=await requireRole("CCI_OFFICER","PLATFORM_ADMIN");let e:ManagedEvent;
  try{e=await api<ManagedEvent>(`/events/managed/${eventId}`,{token});}catch(error){if(error instanceof ApiError&&error.status===404)notFound();throw error;}
  return <div className="dp-stack"><a href="/organisateur/evenements">← Vos événements</a><div style={{borderTop:`6px solid ${e.branding.accent}`,paddingTop:16}}><p className="dp-kicker">{e.branding.label}</p><h1>{e.title}</h1><p>{e.branding.welcome}</p></div>
    <Panel title="État et planning"><p><strong data-control-id="ORG_EVENT_STATE">{EVENT_STATE[e.status]??e.status}</strong> · {e.audience==="PUBLIC"?"Public":"Privé — Guichet Diaspora"}</p><p>{fmtDateTime(e.startsAt)} → {fmtDateTime(e.endsAt)} · {e.capacity} places</p><p className="dp-muted">Fournisseur : {e.provider}. Révision {e.revision}.</p>{e.provider==="local"?<StateBanner tone="info" title="Salle synthétique">Aucune réunion Remo réelle n'est créée. Le branding affiché est propre à cette session locale.</StateBanner>:null}{e.syncError?<StateBanner tone="warning" title="Synchronisation à rapprocher">{e.syncError}. Le créneau n'est pas libéré sur un résultat inconnu.</StateBanner>:null}{e.reservation?<p>Réservation {e.reservation.state} sur {e.reservation.accountKey}, marges incluses.</p>:<p>Aucun créneau réservé.</p>}<EventActions eventId={e.id} status={e.status}/></Panel>
    {e.status==="DRAFT"&&e.audience==="PUBLIC"?<Panel title="Modifier le brouillon"><EventForm event={e}/></Panel>:null}
    <Panel title="Inscriptions et présence">{e.registrations?.length?<div className="dp-tablewrap"><table className="dp-table"><thead><tr><th scope="col">Nom choisi</th><th scope="col">Échange de contacts</th><th scope="col">Présence observée</th></tr></thead><tbody>{e.registrations.map(r=><tr key={r.id}><td>{r.displayName}</td><td>{r.consentContactAt?"Consentie":"Non consentie"}</td><td>{r.joinedAt?fmtDateTime(r.joinedAt):"Non remontée"}</td></tr>)}</tbody></table></div>:<p>Aucune inscription enregistrée.</p>}<p className="dp-muted">Les présences ne constituent pas un compte rendu du contenu. Aucune coordonnée de participant n'est exposée ici.</p></Panel>
  </div>;
}
