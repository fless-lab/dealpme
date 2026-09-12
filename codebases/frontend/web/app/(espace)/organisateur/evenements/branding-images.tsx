"use client";
import { Field, Input } from "@dealpme/ui";
export type BrandImages = { logoUrl: string; coverUrl: string; welcomeMediaUrl: string };
export function BrandingImages({ value, onChange }: { value: BrandImages; onChange: (key: keyof BrandImages, value: string) => void }) {
  return <div className="dp-stack">
    <Field id="brand-logo" label="Logo de marque — URL HTTPS publique stable"><Input id="brand-logo" data-control-id="BRAND_LOGO_URL" type="url" maxLength={2048} value={value.logoUrl} onChange={e => onChange("logoUrl", e.target.value)} /></Field>
    <Field id="brand-cover" label="Visuel de couverture — URL HTTPS publique stable"><Input id="brand-cover" data-control-id="BRAND_COVER_URL" type="url" maxLength={2048} value={value.coverUrl} onChange={e => onChange("coverUrl", e.target.value)} /></Field>
    <Field id="brand-welcome-media" label="Image du message d'accueil — URL HTTPS"><Input id="brand-welcome-media" data-control-id="BRAND_WELCOME_MEDIA" type="url" maxLength={2048} value={value.welcomeMediaUrl} onChange={e => onChange("welcomeMediaUrl", e.target.value)} /></Field>
    <p className="dp-muted">Remo utilise un logo événementiel, un visuel de couverture et un média d&apos;accueil distincts. Sans média d&apos;accueil, son accueil général est conservé. La couleur d&apos;accent reste propre à DealPME et au simulateur.</p>
  </div>;
}
