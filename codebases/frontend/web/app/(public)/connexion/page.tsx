"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Field, Input, StateBanner } from "@dealpme/ui";

/**
 * Connexion. Deux issues : session ouverte (cookie posé par le BFF) ou second facteur requis
 * (officiers CCI-Togo, conformité, administrateurs). Le code de développement (devCode) n'existe qu'en local.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = (await res.json()) as { ok: boolean; mfaRequired?: boolean; challengeId?: string; devCode?: string; message?: string; details?: { reason?: string } };
    setBusy(false);
    if (data.ok) {
      router.push("/");
      router.refresh();
      return;
    }
    if (data.mfaRequired && data.challengeId) {
      setChallengeId(data.challengeId);
      setDevCode(data.devCode ?? null);
      setHint("Un code de connexion vous a été envoyé par SMS. Il est valable 10 minutes.");
      return;
    }
    if (data.details?.reason === "EMAIL_NOT_VERIFIED") {
      router.push(`/verification-email?email=${encodeURIComponent(email)}`);
      return;
    }
    setError(data.message ?? "Connexion impossible.");
  }

  async function submitMfa(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId, code }) });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (data.ok) {
      router.push("/");
      router.refresh();
      return;
    }
    setError(data.message ?? "Code invalide.");
  }

  return (
    <div className="dp-auth">
      <h1>Connexion</h1>
      <p className="dp-lede">Accédez à votre espace DealPME.</p>
      {error ? <StateBanner tone="danger" title="Connexion refusée" controlId="LOGIN_ERROR">{error}</StateBanner> : null}
      {!challengeId ? (
        <form onSubmit={submit} noValidate>
          <Field id="email" label="Adresse email">
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-control-id="LOGIN_EMAIL" />
          </Field>
          <Field id="password" label="Mot de passe">
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} data-control-id="LOGIN_PASSWORD" />
          </Field>
          <Actions>
            <Button controlId="LOGIN_SUBMIT" type="submit" state={busy ? "loading" : "default"}>
              Se connecter
            </Button>
            <a className="dp-btn dp-btn-ghost" href="/inscription" data-control-id="LOGIN_GO_REGISTER">
              Créer un compte
            </a>
          </Actions>
        </form>
      ) : (
        <form onSubmit={submitMfa} noValidate>
          <StateBanner tone="info" title="Second facteur requis" controlId="LOGIN_MFA_NOTICE">
            {hint}
            {devCode ? <div className="dp-muted">Environnement de développement : code {devCode}</div> : null}
          </StateBanner>
          <div style={{ height: 16 }} />
          <Field id="code" label="Code reçu par SMS" hint="Six chiffres">
            <Input id="code" inputMode="numeric" pattern="[0-9]{6}" required value={code} onChange={(e) => setCode(e.target.value)} data-control-id="LOGIN_MFA_CODE" />
          </Field>
          <Actions>
            <Button controlId="LOGIN_MFA_SUBMIT" type="submit" state={busy ? "loading" : "default"}>
              Valider le code
            </Button>
            <Button controlId="LOGIN_MFA_CANCEL" type="button" variant="ghost" onClick={() => setChallengeId(null)}>
              Revenir
            </Button>
          </Actions>
        </form>
      )}
    </div>
  );
}
