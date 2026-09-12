import { redirect,notFound } from "next/navigation";
import { IdSchema } from "@dealpme/contracts";
import { StateBanner } from "@dealpme/ui";
import { api,messageFor } from "../../../../lib/api";
import { getSession } from "../../../../lib/session";
export default async function EventAccess({params}:{params:Promise<{eventId:string}>}){
  const {eventId}=await params,session=await getSession();if(!session)redirect("/connexion");
  if(!IdSchema.safeParse(eventId).success)notFound();
  let url:string;
  try{url=(await api<{joinUrl:string}>(`/events/${eventId}/join-url`,{token:session.token})).joinUrl;}
  catch(error){return <div className="dp-stack"><h1>Accès à la salle</h1><StateBanner tone="warning" title="Salle indisponible" controlId="EVENT_ACCESS_ERROR">{messageFor(error)}</StateBanner><a href={`/evenements/${eventId}/acces`} className="dp-btn dp-btn-primary">Réessayer</a><a href="/evenements">Retour aux événements</a></div>;}
  redirect(url);
}
