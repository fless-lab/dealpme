import { Panel, PartnerResponsibilityStrip, StateBanner } from "@dealpme/ui";
import { api, ApiError } from "../../lib/api";
import { fmtDateTime } from "../../lib/guards";
import { getSession } from "../../lib/session";
import { EventCard } from "./event-card";

export const metadata = { title: "Deal-Connect", description: "Rencontres B2B entre cédants, repreneurs et partenaires financiers." };

export interface DealConnectEvent {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  registered: number;
  seatsLeft: number;
  campaignId: string | null;
  integrationMode: string;
  liveReady: boolean;
  myRegistration: { displayName: string; consentContact: boolean } | null;
}

/**
 * Deal-Connect (P20) : rencontres B2B dont la session live est hébergée par un partenaire externe.
 * DealPME reste la référence des inscriptions et de l'attribution ; le partenaire n'héberge que la salle,
 * et ne reçoit que le nom d'affichage choisi par le participant.
 */
export default async function EventsPage() {
  const session = await getSession();
  let items: DealConnectEvent[] = [];
  let error: string | null = null;
  try {
    items = (await api<{ items: DealConnectEvent[] }>("/events", { token: session?.token ?? null })).items;
  } catch (e) {
    error = e instanceof ApiError ? e.envelope.message : "Service indisponible";
  }

  const canRegister = !!session && session.me.roles.some((r) => ["SELLER", "INVESTOR", "INVESTOR_DIASPORA", "ADVISOR", "BANK"].includes(r));

  return (
    <div className="dp-stack">
      <div>
        <h1>Deal-Connect</h1>
        <p className="dp-muted" style={{ maxWidth: "70ch" }}>
          Rencontres entre cédants, repreneurs et partenaires financiers. Les stands ne présentent jamais d'offre de
          titres : un salon reste un lieu de rencontre, pas un canal de placement.
        </p>
      </div>

      <PartnerResponsibilityStrip
        partner="Partenaire d'hébergement des sessions live"
        text="La salle virtuelle et la vidéo relèvent du partenaire. DealPME tient les inscriptions, les consentements et l'attribution, et ne lui transmet que le nom d'affichage que vous choisissez."
      />

      {error ? <StateBanner tone="warning" title="Événements indisponibles" controlId="EVENTS_ERROR">{error}</StateBanner> : null}
      {!error && items.length === 0 ? (
        <StateBanner tone="info" title="Aucun événement publié pour le moment" controlId="EVENTS_EMPTY">
          Les rencontres sont organisées avec la CCI-Togo. La prochaine sera annoncée ici.
        </StateBanner>
      ) : null}

      {items.map((e) => (
        <EventCard key={e.id} event={e} canRegister={canRegister} connected={!!session} />
      ))}

      {items.length > 0 ? (
        <Panel title="Ce qui est partagé, et avec qui" controlId="EVENTS_PRIVACY">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Votre inscription est enregistrée par DealPME, avec la campagne à laquelle l'événement se rattache.</li>
            <li>Le partenaire qui héberge la salle reçoit uniquement le nom d'affichage que vous saisissez.</li>
            <li>
              Vos coordonnées ne sont échangées avec un autre participant que si vous y consentez explicitement, et ce
              consentement se retire à tout moment avant l'événement.
            </li>
            <li>Votre présence effective est enregistrée pour le compte rendu de la rencontre, jamais revendue.</li>
          </ul>
        </Panel>
      ) : null}

      {items.length > 0 && !session ? (
        <StateBanner tone="info" title="Connectez-vous pour vous inscrire" controlId="EVENTS_ANON">
          <div className="dp-actions" style={{ marginTop: 8 }}>
            <a className="dp-btn dp-btn-primary" href="/inscription" data-control-id="EVENTS_REGISTER_CTA">
              Créer un compte
            </a>
            <a className="dp-btn dp-btn-secondary" href="/connexion" data-control-id="EVENTS_LOGIN_CTA">
              Se connecter
            </a>
          </div>
        </StateBanner>
      ) : null}

      <p className="dp-muted" style={{ fontSize: "0.82rem" }}>
        Les horaires sont donnés en heure locale du Togo. Prochaine mise à jour à chaque publication d'événement
        {items.length > 0 ? ` ; le prochain rendez-vous est le ${fmtDateTime(items[0]!.startsAt)}` : ""}.
      </p>
    </div>
  );
}
