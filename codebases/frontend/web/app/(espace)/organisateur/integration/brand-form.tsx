"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, StateBanner } from "@dealpme/ui";
import type { ManagedEvent } from "../../../../lib/events";
import { BrandingImages } from "../evenements/branding-images";
export function AccountBrandForm({ branding, revision, editable }: { branding: ManagedEvent["branding"]; revision: number; editable: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...branding, logoUrl: branding.logoUrl ?? "", coverUrl: branding.coverUrl ?? "", welcomeMediaUrl: branding.welcomeMediaUrl ?? "" });
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null);
  const set = (key: keyof typeof form, value: string) => setForm(f => ({ ...f, [key]: value }));
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(null);
    const value = { label: form.label, accent: form.accent, welcome: form.welcome, ...(form.logoUrl ? { logoUrl: form.logoUrl } : {}), ...(form.coverUrl ? { coverUrl: form.coverUrl } : {}), ...(form.welcomeMediaUrl ? { welcomeMediaUrl: form.welcomeMediaUrl } : {}) };
    try { const r = await fetch("/api/organisateur/events/account-branding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branding: value, expectedRevision: revision }) }); const d = await r.json() as { ok: boolean; message?: string }; setMessage(d.ok ? "Profil par défaut enregistré pour les prochains événements." : d.message ?? "Modification non confirmée."); router.refresh(); }
    catch { setMessage("Connexion interrompue. Vos saisies sont conservées."); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="dp-stack">{message ? <StateBanner tone="info" title="Profil global">{message}</StateBanner> : null}<fieldset disabled={!editable || busy} className="dp-stack"><legend>Valeurs par défaut DealPME pour ce compte</legend><Field id="account-brand-label" label="Nom de marque"><Input id="account-brand-label" required maxLength={100} value={form.label} onChange={e => set("label", e.target.value)} /></Field><Field id="account-brand-accent" label="Accent DealPME"><Input id="account-brand-accent" type="color" value={form.accent} onChange={e => set("accent", e.target.value)} /></Field><Field id="account-brand-welcome" label="Accueil"><Input id="account-brand-welcome" maxLength={300} value={form.welcome} onChange={e => set("welcome", e.target.value)} /></Field><BrandingImages value={form} onChange={set}/></fieldset><p>Révision {revision}. Les événements déjà préparés conservent leur profil. La modification de ces valeurs n&apos;écrit pas les réglages de marque blanche du compte Remo.</p>{editable ? <Button type="submit" controlId="REMO_ACCOUNT_BRAND_SAVE" disabled={busy}>Enregistrer le profil global</Button> : <p>Modification réservée à l&apos;administration du compte mutualisé.</p>}</form>;
}
