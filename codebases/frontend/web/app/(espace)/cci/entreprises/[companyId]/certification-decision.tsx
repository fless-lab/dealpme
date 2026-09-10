"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Checkbox, Field, Select, StateBanner, Textarea } from "@dealpme/ui";

const DEFAULT_SCOPE =
  "Existence juridique, immatriculation au RCCM et complétude documentaire vérifiées par la CCI-Togo. Ne portent ni sur l'exactitude des états financiers, ni sur l'absence de litige, ni sur la valeur de l'entreprise.";

/**
 * Décision de certification Deal-Ready. Nominative : elle porte le nom de l'officier connecté.
 * Un officier qui déclare un conflit d'intérêts ne peut pas décider ; le serveur refuse la requête (DP-CCI-006).
 */
export function CertificationDecision({ companyId, officerEmail, hasDecision, isDealReady }: { companyId: string; officerEmail: string; hasDecision: boolean; isDealReady: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"GRANTED" | "REFUSED" | "REVOKED">(isDealReady ? "REVOKED" : "GRANTED");
  const [scope, setScope] = useState(DEFAULT_SCOPE);
  const [reason, setReason] = useState("");
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (conflict) {
      setError("Vous avez déclaré un conflit d'intérêts : la décision revient à un autre officier.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/institution/certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, decision, scopeStatement: scope, conflictOfInterestDeclared: false, ...(reason ? { reason } : {}) }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string; code?: string };
    setBusy(false);
    if (data.ok) {
      setOpen(false);
      router.refresh();
      return;
    }
    setError(data.code === "INVALID_TRANSITION" ? "La certification exige une vérification RCCM ou CFE préalable." : (data.message ?? "Décision refusée."));
  }

  if (!open) {
    return (
      <Actions>
        <Button controlId="CCI_CERT_OPEN" variant={hasDecision ? "secondary" : "primary"} onClick={() => setOpen(true)}>
          {hasDecision ? "Nouvelle décision" : "Décider"}
        </Button>
      </Actions>
    );
  }
  return (
    <form onSubmit={submit} noValidate>
      {error ? <StateBanner tone="danger" title="Décision refusée" controlId="CCI_CERT_ERROR">{error}</StateBanner> : null}
      <p className="dp-muted" style={{ marginTop: 0 }}>
        Décision prise au nom de {officerEmail}. Elle est horodatée, journalisée et exportable.
      </p>
      <Field id="decision" label="Décision">
        <Select id="decision" value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)} data-control-id="CCI_CERT_DECISION">
          <option value="GRANTED">Accorder la certification Deal-Ready</option>
          <option value="REFUSED">Refuser</option>
          <option value="REVOKED">Retirer une certification en cours</option>
        </Select>
      </Field>
      <Field id="scope" label="Portée de la certification" hint="Texte affiché avec le badge : il dit ce qui est vérifié et ce qui ne l'est pas. Vingt caractères minimum.">
        <Textarea id="scope" rows={4} required minLength={20} value={scope} onChange={(e) => setScope(e.target.value)} data-control-id="CCI_CERT_SCOPE" />
      </Field>
      {decision !== "GRANTED" ? (
        <Field id="reason" label={decision === "REFUSED" ? "Motif du refus" : "Motif du retrait"} hint="Communiqué à l'entreprise avec la liste des pièces à reprendre.">
          <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} data-control-id="CCI_CERT_REASON" />
        </Field>
      ) : null}
      <div style={{ margin: "16px 0" }}>
        <Checkbox
          id="conflict"
          label="Je déclare un conflit d'intérêts sur ce dossier (lien personnel, familial ou d'affaires)."
          checked={conflict}
          onChange={(e) => setConflict(e.target.checked)}
          data-control-id="CCI_CERT_CONFLICT"
        />
      </div>
      <Actions>
        <Button controlId="CCI_CERT_SUBMIT" type="submit" state={busy ? "loading" : conflict ? "blocked" : "default"} disabled={conflict}>
          Enregistrer la décision
        </Button>
        <Button controlId="CCI_CERT_CANCEL" type="button" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </Actions>
      {conflict ? (
        <StateBanner tone="warning" title="Décision bloquée" controlId="CCI_CERT_CONFLICT_BLOCK">
          Un officier ayant déclaré un conflit d'intérêts ne peut pas décider. Transmettez le dossier à un autre officier.
        </StateBanner>
      ) : null}
    </form>
  );
}
