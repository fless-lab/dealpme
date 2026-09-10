"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, DecisionGate, StateBanner } from "@dealpme/ui";

/**
 * Soumission à vérification. La porte est fermée tant que le dossier est incomplet : c'est le serveur
 * qui tranche, l'écran ne fait que montrer l'état et rendre le refus lisible.
 */
export function SubmitDossier({ dealId, complete, status }: { dealId: string; complete: boolean; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<{ label: string }[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setMissing([]);
    const res = await fetch(`/api/dossier/${dealId}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = (await res.json()) as { ok: boolean; message?: string; details?: { missing?: { label: string }[] } };
    setBusy(false);
    if (data.ok) {
      router.refresh();
      return;
    }
    setError(data.message ?? "Soumission impossible.");
    setMissing(data.details?.missing ?? []);
  }

  if (status !== "DRAFT") {
    return (
      <DecisionGate kind="certification" title="Soumission du dossier" state="decided" decidedBy="Cédant" controlId="SELLER_SUBMIT_GATE">
        <StateBanner tone="success" title="Dossier transmis à la CCI-Togo" controlId="SELLER_SUBMIT_DONE">
          L'instruction porte sur l'existence juridique, l'immatriculation et la complétude documentaire. La décision de
          certification Deal-Ready revient à un officier nommé de la CCI-Togo : elle n'est jamais automatique.
        </StateBanner>
      </DecisionGate>
    );
  }

  return (
    <DecisionGate kind="certification" title="Soumettre le dossier à la CCI-Togo" state={complete ? "ready" : "blocked"} controlId="SELLER_SUBMIT_GATE">
      {complete ? (
        <>
          <p style={{ marginTop: 0 }}>
            La soumission transmet les informations déclarées et les pièces à la CCI-Togo pour instruction. Le dossier
            n'est pas modifiable pendant ce temps.
          </p>
          <Button controlId="SELLER_SUBMIT" state={busy ? "loading" : "default"} onClick={submit}>
            Soumettre à vérification
          </Button>
        </>
      ) : (
        <StateBanner tone="warning" title="Dossier incomplet" controlId="SELLER_SUBMIT_BLOCKED">
          Le dossier reste en préparation tant que des éléments manquent. Complétez les étapes signalées dans la
          navigation, puis revenez ici.
        </StateBanner>
      )}
      {error ? (
        <StateBanner tone="danger" title="Soumission refusée" controlId="SELLER_SUBMIT_ERROR">
          {error}
          {missing.length > 0 ? (
            <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
              {missing.map((m) => (
                <li key={m.label}>{m.label}</li>
              ))}
            </ul>
          ) : null}
        </StateBanner>
      ) : null}
    </DecisionGate>
  );
}
