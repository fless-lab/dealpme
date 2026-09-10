"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@dealpme/ui";

/** Consentement et suppression d'une alerte. Le retrait est aussi accessible que l'acceptation. */
export function AlertRow({ alertId, optIn }: { alertId: string; optIn: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"optin" | "delete" | null>(null);

  async function toggle() {
    setBusy("optin");
    await fetch(`/api/marketplace/alerts/${alertId}/opt-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifyOptIn: !optIn }),
    });
    setBusy(null);
    router.refresh();
  }

  async function remove() {
    setBusy("delete");
    await fetch(`/api/marketplace/alerts/${alertId}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="dp-actions">
      <Button controlId="INV_ALERT_TOGGLE" variant="secondary" state={busy === "optin" ? "loading" : "default"} onClick={toggle}>
        {optIn ? "Retirer mon consentement" : "Accepter d'être prévenu"}
      </Button>
      <Button controlId="INV_ALERT_DELETE" variant="ghost" state={busy === "delete" ? "loading" : "default"} onClick={remove}>
        Supprimer
      </Button>
    </div>
  );
}
