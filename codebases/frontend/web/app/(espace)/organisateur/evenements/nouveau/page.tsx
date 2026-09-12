import { Panel } from "@dealpme/ui";
import { requireRole } from "../../../../../lib/guards";
import { EventForm } from "../event-form";
export const metadata={title:"Créer un événement"};
export default async function NewEvent(){await requireRole("CCI_OFFICER","PLATFORM_ADMIN");return <div className="dp-stack"><h1>Créer un événement</h1><Panel title="Préparation de la rencontre"><EventForm/></Panel></div>;}
