"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Checkbox, Field, Input, Panel, StateBanner, StatusBadge } from "@dealpme/ui";
import type { DealConnectEvent } from "./page";

function fmt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR",{timeZone:"Africa/Lome",dateStyle:"full",timeStyle:"short"}).format(new Date(iso));
}

/**
 * Un événement et son inscription. Le consentement à l'échange de contacts est une case distincte,
 * jamais pré-cochée, et il se retire au même endroit qu'il se donne.
 */
export function EventCard({ event, canRegister, connected }: { event: DealConnectEvent; canRegister: boolean; connected: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const full = event.seatsLeft === 0 && !event.myRegistration;

  async function register(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try { const res = await fetch(`/api/events/${event.id}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, consentContact: consent }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (data.ok) {
      setOpen(false);
      router.refresh();
      return;
    }
    setError(data.message ?? "Inscription impossible.");
    } catch {setError("Connexion interrompue. Vos saisies sont conservées.");} finally {setBusy(false);}
  }

  async function toggleConsent() {
    setBusy(true);
    setError(null);
    try { const response=await fetch(`/api/events/${event.id}/contact-consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consentContact: !event.myRegistration?.consentContact }),
    });
    const data=await response.json() as {ok:boolean;message?:string};if(!data.ok){setError(data.message??"Consentement non modifié");return;}
    router.refresh();
    }catch{setError("Connexion interrompue : le changement n'est pas confirmé.");}finally{setBusy(false);}
  }

  return (
    <Panel title={event.title} controlId="EVENT_CARD">
      <p className="dp-muted" style={{ marginTop: 0 }}>
        {fmt(event.startsAt)} → {fmt(event.endsAt)} (Togo)
      </p>
      {event.description ? <p style={{ maxWidth: "70ch" }}>{event.description}</p> : null}
      <p style={{borderLeft:`4px solid ${event.branding.accent}`,paddingLeft:12}}><strong>{event.branding.label}</strong> — {event.branding.welcome}</p>
      {event.simulated?<StateBanner tone="info" title="Session de démonstration">Salle locale synthétique ou événement historique non raccordé au fournisseur réel.</StateBanner>:null}
      {error&&event.myRegistration?<StateBanner tone="danger" title="Action non confirmée">{error}</StateBanner>:null}

      <div className="dp-actions" style={{ alignItems: "center" }}>
        {event.myRegistration ? <StatusBadge status="verified" label="Vous êtes inscrit" controlId="EVENT_REGISTERED" /> : null}
        {full ? <StatusBadge status="restricted" label="Complet" controlId="EVENT_FULL" /> : null}
        <span className="dp-muted">
          {event.registered} inscrit(s) sur {event.capacity} places
          {event.seatsLeft > 0 ? ` - ${event.seatsLeft} restantes` : ""}
        </span>
      </div>

      {event.myRegistration ? (
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: "0 0 8px" }}>
            Vous participez sous le nom <b>{event.myRegistration.displayName}</b>. C'est la seule information
            transmise au partenaire qui héberge la salle.
          </p>
          <div className="dp-actions" style={{ alignItems: "center" }}>
            <StatusBadge
              status={event.myRegistration.consentContact ? "verified" : "neutral"}
              label={event.myRegistration.consentContact ? "Échange de contacts accepté" : "Échange de contacts refusé"}
            />
            <Button controlId="EVENT_CONSENT_TOGGLE" variant="secondary" state={busy ? "loading" : "default"} onClick={toggleConsent}>
              {event.myRegistration.consentContact ? "Retirer mon consentement" : "Accepter l'échange de contacts"}
            </Button>
            {event.liveReady ? (
              <a className="dp-btn dp-btn-primary" href={`/evenements/${event.id}/acces`} target="_blank" rel="noreferrer" title="Ouvre un nouvel onglet" data-control-id="EVENT_JOIN">
                Rejoindre la salle
              </a>
            ) : null}
          </div>
          {!event.liveReady ? (
            <StateBanner tone="info" title="Salle pas encore ouverte" controlId="EVENT_NOT_LIVE">
              Le lien d'accès est délivré une fois la salle créée chez le partenaire, peu avant l'événement. Votre
              inscription est enregistrée.
            </StateBanner>
          ) : null}
        </div>
      ) : canRegister ? (
        open ? (
          <form onSubmit={register} style={{ marginTop: 16 }} noValidate>
            {error ? <StateBanner tone="danger" title="Inscription refusée" controlId="EVENT_ERROR">{error}</StateBanner> : null}
            <Field id={`name-${event.id}`} label="Nom d'affichage" hint="Ce que les autres participants verront. C'est la seule donnée transmise au partenaire.">
              <Input id={`name-${event.id}`} required minLength={2} value={displayName} onChange={(e) => setDisplayName(e.target.value)} data-control-id="EVENT_DISPLAY_NAME" />
            </Field>
            <Checkbox
              id={`consent-${event.id}`}
              label="J'accepte d'échanger mes coordonnées avec les participants que je rencontre."
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              data-control-id="EVENT_CONSENT"
            />
            <p className="dp-muted" style={{ fontSize: "0.82rem" }}>
              Sans cette case, vous participez normalement : seul l'échange de coordonnées est désactivé. Le
              consentement se retire à tout moment.
            </p>
            <Actions>
              <Button controlId="EVENT_REGISTER_SUBMIT" type="submit" state={busy ? "loading" : "default"}>
                M'inscrire
              </Button>
              <Button controlId="EVENT_REGISTER_CANCEL" type="button" variant="ghost" onClick={() => setOpen(false)}>
                Annuler
              </Button>
            </Actions>
          </form>
        ) : (
          <Actions>
            <Button controlId="EVENT_REGISTER_OPEN" state={full||event.ended ? "blocked" : "default"} disabled={full||event.ended} onClick={() => setOpen(true)}>
              {event.ended?"Événement terminé":full ? "Complet" : "M'inscrire"}
            </Button>
          </Actions>
        )
      ) : connected ? (
        <StateBanner tone="info" title="Votre compte ne peut pas s'inscrire à cet événement" controlId="EVENT_ROLE">
          Les rencontres Deal-Connect sont ouvertes aux cédants, aux repreneurs, aux conseils et aux banques.
        </StateBanner>
      ) : null}
    </Panel>
  );
}
