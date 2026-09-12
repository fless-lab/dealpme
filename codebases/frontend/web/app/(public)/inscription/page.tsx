"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Checkbox, Field, Input, Select, StateBanner } from "@dealpme/ui";
import { authRequest } from "../../../lib/auth-request";

/**
 * Inscription (P08). Consentements séparés : conditions et confidentialité obligatoires, marketing jamais pré-coché.
 * L'attribution (canal, campagne, parrainage) est capturée ici et devient immuable côté serveur.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", phoneE164: "+228", organisationName: "", role: "SELLER", terms: false, privacy: false, marketing: false, referralCode: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.terms || !form.privacy) {
      setError("Les conditions d'utilisation et la politique de confidentialité doivent être acceptées séparément.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
    const params = new URLSearchParams(window.location.search);
    const data = await authRequest("register", {
        email: form.email,
        password: form.password,
        phoneE164: form.phoneE164,
        organisationName: form.organisationName,
        role: form.role,
        consents: { termsAccepted: form.terms, privacyAccepted: form.privacy, marketingOptIn: form.marketing },
        attribution: { channel: params.get("canal") ?? "SELF_REGISTRATION", campaignId: params.get("campagne"), referralCode: form.referralCode || null },
    });
    if (data.ok && data.emailChallengeId) {
      const q = new URLSearchParams({ email: form.email, challenge: data.emailChallengeId });
      router.push(`/verification-email?${q.toString()}`);
      return;
    }
    setError(data.message ?? "Inscription impossible.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Inscription indisponible."); }
    finally { setBusy(false); }
  }

  return (
    <div className="dp-auth">
      <h1>Créer un compte</h1>
      <p className="dp-lede">Cédant, investisseur ou conseil : l'inscription est individuelle et vérifiée.</p>
      {error ? <StateBanner tone="danger" title="Inscription refusée" controlId="REGISTER_ERROR">{error}</StateBanner> : null}
      <form onSubmit={submit} noValidate>
        <Field id="role" label="Vous êtes">
          <Select id="role" value={form.role} onChange={(e) => set("role")(e.target.value)} data-control-id="REGISTER_ROLE">
            <option value="SELLER">Cédant (je transmets une entreprise)</option>
            <option value="INVESTOR">Investisseur (je reprends ou j'investis)</option>
            <option value="INVESTOR_DIASPORA">Investisseur de la diaspora</option>
            <option value="ADVISOR">Conseil (j'accompagne des clients)</option>
          </Select>
        </Field>
        <Field id="organisationName" label="Nom de l'organisation ou raison sociale">
          <Input id="organisationName" required value={form.organisationName} onChange={(e) => set("organisationName")(e.target.value)} data-control-id="REGISTER_ORG" />
        </Field>
        <Field id="email" label="Adresse email">
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set("email")(e.target.value)} data-control-id="REGISTER_EMAIL" />
        </Field>
        <Field id="phone" label="Téléphone mobile" hint="Format international, par exemple +22890000000. Un code de connexion peut vous y être envoyé.">
          <Input id="phone" type="tel" required value={form.phoneE164} onChange={(e) => set("phoneE164")(e.target.value)} data-control-id="REGISTER_PHONE" />
        </Field>
        <Field id="password" label="Mot de passe" hint="Douze caractères minimum.">
          <Input id="password" type="password" autoComplete="new-password" minLength={12} required value={form.password} onChange={(e) => set("password")(e.target.value)} data-control-id="REGISTER_PASSWORD" />
        </Field>
        <Field id="referral" label="Code de parrainage ou référence CCI-Togo (facultatif)">
          <Input id="referral" value={form.referralCode} onChange={(e) => set("referralCode")(e.target.value)} data-control-id="REGISTER_REFERRAL" />
        </Field>
        <div className="dp-stack" style={{ marginBottom: 24 }}>
          <Checkbox id="terms" label="J'accepte les conditions d'utilisation." checked={form.terms} onChange={(e) => set("terms")(e.target.checked)} data-control-id="REGISTER_CONSENT_TERMS" />
          <Checkbox id="privacy" label="J'ai lu la politique de confidentialité et le traitement de mes données." checked={form.privacy} onChange={(e) => set("privacy")(e.target.checked)} data-control-id="REGISTER_CONSENT_PRIVACY" />
          <Checkbox id="marketing" label="J'accepte de recevoir des informations sur les événements et services DealPME (facultatif)." checked={form.marketing} onChange={(e) => set("marketing")(e.target.checked)} data-control-id="REGISTER_CONSENT_MARKETING" />
        </div>
        <Actions>
          <Button controlId="REGISTER_SUBMIT" type="submit" state={busy ? "loading" : "default"}>
            Créer mon compte
          </Button>
          <a className="dp-btn dp-btn-ghost" href="/connexion" data-control-id="REGISTER_GO_LOGIN">
            J'ai déjà un compte
          </a>
        </Actions>
      </form>
    </div>
  );
}
