"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, DecisionGate, StateBanner } from "@dealpme/ui";
import { DEAL_STATUS_LABEL } from "../../../../../lib/dossier";

/**
 * Publication d'un dossier vérifié. Pour une cession de titres, la plateforme refuse la publication ouverte :
 * l'écran le dit avant l'action, et le serveur le refuse de toute façon (PERIMETER_BLOCKED).
 */
export function PublishDeal({ dealId, status, dealType }: { dealId: string; status: string; dealType: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isShare = dealType === "SHARE_DEAL";
  const published = ["LISTED_OPEN", "LISTED_RESTRICTED", "ENGAGED", "DUE_DILIGENCE", "NEGOTIATION"].includes(status);

  async function publish() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/marketplace/deals/${dealId}/publish`, { method: "POST" });
    const data = (await res.json()) as { ok: boolean; message?: string; code?: string };
    setBusy(false);
    if (data.ok) {
      router.refresh();
      return;
    }
    setError(data.code === "PERIMETER_BLOCKED" ? "Publication bloquée par le périmètre réglementaire : une cession de titres ne peut pas être diffusée au-delà d'un cercle restreint." : (data.message ?? "Publication impossible."));
  }

  if (published) {
    return (
      <DecisionGate kind="offer" title="Publication" state="decided" decidedBy="Cédant" controlId="SELLER_PUBLISH_GATE">
        <StateBanner tone="success" title={`Dossier ${DEAL_STATUS_LABEL[status]?.toLowerCase() ?? status}`} controlId="SELLER_PUBLISH_DONE">
          Le dossier est visible au palier T0 : secteur, région et tranche de chiffre d'affaires. Ni l'identité de
          l'entreprise, ni le prix ne sont communiqués à ce stade.
        </StateBanner>
      </DecisionGate>
    );
  }

  return (
    <DecisionGate kind="offer" title="Publication" state={status === "VERIFIED" && !isShare ? "ready" : "blocked"} controlId="SELLER_PUBLISH_GATE">
      {isShare ? (
        <StateBanner tone="warning" title="Publication ouverte impossible" controlId="SELLER_PUBLISH_SHARE">
          Une cession de titres ne se propose pas au public. La diffusion passe par un cercle restreint dont chaque
          membre est admis nominativement par le service de conformité.
        </StateBanner>
      ) : status === "VERIFIED" ? (
        <>
          <p style={{ marginTop: 0 }}>
            La publication rend visible le palier T0 uniquement : secteur, région et tranche de chiffre d'affaires.
            Elle n'est pas réversible : un dossier publié se ferme en l'abandonnant, ce qui est définitif. Une
            suspension temporaire est à l'étude.
          </p>
          <Button controlId="SELLER_PUBLISH" state={busy ? "loading" : "default"} onClick={publish}>
            Publier sur la place de marché
          </Button>
        </>
      ) : (
        <StateBanner tone="info" title="Le dossier n'est pas encore vérifié" controlId="SELLER_PUBLISH_NOT_READY">
          La publication attend la vérification du dossier par la CCI-Togo. État actuel : {DEAL_STATUS_LABEL[status] ?? status}.
        </StateBanner>
      )}
      {error ? <StateBanner tone="danger" title="Publication refusée" controlId="SELLER_PUBLISH_ERROR">{error}</StateBanner> : null}
    </DecisionGate>
  );
}
