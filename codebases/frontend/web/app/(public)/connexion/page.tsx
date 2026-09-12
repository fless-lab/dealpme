"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Field, Input, StateBanner } from "@dealpme/ui";
import { authRequest } from "../../../lib/auth-request";

/**
 * Connexion. Deux issues : session ouverte (cookie posé par le BFF) ou second facteur requis
 * (officiers CCI-Togo, conformité, administrateurs). Le code est reçu par le canal SMS configuré.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Destination fermée : aucune URL arbitraire de retour n'est suivie après authentification.
  const destination = () => new URLSearchParams(window.location.search).get("next") === "/sso/remo/complete" ? "/sso/remo/complete" : "/";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
    const data = await authRequest("login", { email, password });
    if (data.ok) {
      if (destination() !== "/") { window.location.assign(destination()); return; }
      router.push("/");
      router.refresh();
      return;
    }
    if (data.mfaRequired && data.challengeId) {
      setChallengeId(data.challengeId);
      setHint("Un code de connexion vous a été envoyé par SMS. Il est valable 10 minutes.");
      return;
    }
    if (data.details?.reason === "EMAIL_NOT_VERIFIED") {
      const params = new URLSearchParams({ email, ...(data.details.challengeId ? { challenge: data.details.challengeId } : {}) });
      router.push(`/verification-email?${params}`);
      return;
    }
    setError(data.message ?? "Connexion impossible.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connexion indisponible."); }
    finally { setBusy(false); }
  }

  async function submitMfa(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
    const data = await authRequest("mfa", { challengeId, code });
    if (data.ok) {
      if (destination() !== "/") { window.location.assign(destination()); return; }
      router.push("/");
      router.refresh();
      return;
    }
    setError(data.message ?? "Code invalide.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Vérification indisponible."); }
    finally { setBusy(false); }
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
