"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Actions, Button, Field, Input, StateBanner } from "@dealpme/ui";

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const challengeId = params.get("challenge") ?? "";
  const devCode = params.get("devCode");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/email-verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId, code }) });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (data.ok) {
      setDone(true);
      setTimeout(() => router.push("/connexion"), 1200);
      return;
    }
    setError(data.message ?? "Code invalide.");
  }

  if (!challengeId) {
    return (
      <StateBanner tone="warning" title="Vérification impossible" controlId="VERIFY_EMAIL_MISSING">
        Aucun code en attente pour cette adresse. Connectez-vous : un nouveau code vous sera proposé si nécessaire.
      </StateBanner>
    );
  }
  return (
    <>
      {done ? <StateBanner tone="success" title="Adresse vérifiée" controlId="VERIFY_EMAIL_DONE">Vous pouvez maintenant vous connecter.</StateBanner> : null}
      {error ? <StateBanner tone="danger" title="Code refusé" controlId="VERIFY_EMAIL_ERROR">{error}</StateBanner> : null}
      {devCode ? <p className="dp-muted">Environnement de développement : code {devCode}</p> : null}
      <form onSubmit={submit} noValidate>
        <Field id="code" label={`Code reçu à l'adresse ${email}`} hint="Six chiffres, valable 10 minutes.">
          <Input id="code" inputMode="numeric" pattern="[0-9]{6}" required value={code} onChange={(e) => setCode(e.target.value)} data-control-id="VERIFY_EMAIL_CODE" />
        </Field>
        <Actions>
          <Button controlId="VERIFY_EMAIL_SUBMIT" type="submit" state={busy ? "loading" : "default"}>
            Vérifier mon adresse
          </Button>
        </Actions>
      </form>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="dp-auth">
      <h1>Vérification de l'adresse email</h1>
      <p className="dp-lede">Cette étape confirme que l'adresse vous appartient avant toute première connexion.</p>
      <Suspense fallback={null}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
