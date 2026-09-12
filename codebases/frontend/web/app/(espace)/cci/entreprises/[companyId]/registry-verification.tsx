"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Actions, Button, Field, Input, Select, StateBanner } from "@dealpme/ui";

const FORMS = ["SA", "SARL", "SAS", "SNC", "SCS", "GIE", "SOCIETE_CIVILE", "AUTRE"];

/**
 * Vérification RCCM / CFE. En mode manuel, l'officier reporte ce qu'il a lu au registre et indique
 * la source de sa consultation : le résultat est enregistré séparément des données déclarées.
 */
export function RegistryVerification({ companyId, declaredName, declaredForm, declaredRccm, manual, incidentId }: { companyId: string; declaredName: string; declaredForm: string; declaredRccm: string | null; manual: boolean; incidentId?: string | undefined }) {
  const router = useRouter();
  const [form, setForm] = useState({ rccmNumber: declaredRccm ?? "", legalName: declaredName, legalForm: declaredForm, status: "ACTIVE", sourceRef: "", decision: "CONFIRMED", reason: "", fallbackReason: "" });
  const [fallback, setFallback] = useState(false);
  const manualEntry = manual || (fallback && !!incidentId);
  const request = useRef<{ body: string; id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const body = {
      companyId,
      rccmNumber: form.rccmNumber,
      legalForm: form.legalForm,
      ...(manualEntry ? { manualResult: { legalName: form.legalName, legalForm: form.legalForm, status: form.status, sourceRef: form.sourceRef, decision: form.decision, ...(form.reason ? { reason: form.reason } : {}) } } : {}),
      ...(!manual && manualEntry ? { fallbackFromId: incidentId, fallbackReason: form.fallbackReason } : {}),
    };
    const serialized = JSON.stringify(body);
    if (request.current?.body !== serialized) request.current = { body: serialized, id: crypto.randomUUID() };
    try {
      const res = await fetch("/api/institution/registry-verifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, requestId: request.current.id }) });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (data.ok) { request.current = null; router.refresh(); return; }
      setError(data.message ?? "Vérification impossible.");
    } catch { setError("Connexion interrompue. Réessayez : la même consultation ne sera pas enregistrée deux fois."); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} noValidate>
      {error ? <StateBanner tone="danger" title="Vérification refusée" controlId="CCI_REGISTRY_ERROR">{error}</StateBanner> : null}
      <Field id="rccm" label="Numéro RCCM consulté">
        <Input id="rccm" required minLength={3} maxLength={64} value={form.rccmNumber} onChange={(e) => set("rccmNumber")(e.target.value)} data-control-id="CCI_REGISTRY_RCCM" />
      </Field>
      {!manual && incidentId ? <Field id="fallback" label="Reprise après incident"><Select id="fallback" data-control-id="CCI_REGISTRY_FALLBACK" value={fallback ? "manual" : "api"} onChange={(e) => setFallback(e.target.value === "manual")}><option value="api">Réessayer l'API</option><option value="manual">Reprendre manuellement avec une source réelle</option></Select></Field> : null}
      {!manual && manualEntry ? <Field id="fallbackReason" label="Motif de reprise manuelle"><Input id="fallbackReason" data-control-id="CCI_REGISTRY_FALLBACK_REASON" required value={form.fallbackReason} onChange={(e) => set("fallbackReason")(e.target.value)} /></Field> : null}
      {manualEntry ? (
        <>
          <Field id="legalName" label="Raison sociale lue au registre">
            <Input id="legalName" required value={form.legalName} onChange={(e) => set("legalName")(e.target.value)} data-control-id="CCI_REGISTRY_NAME" />
          </Field>
          <Field id="legalForm" label="Forme juridique lue au registre">
            <Select id="legalForm" value={form.legalForm} onChange={(e) => set("legalForm")(e.target.value)} data-control-id="CCI_REGISTRY_FORM">
              {FORMS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="status" label="Situation au registre">
            <Select id="status" value={form.status} onChange={(e) => set("status")(e.target.value)} data-control-id="CCI_REGISTRY_STATUS">
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspendue</option>
              <option value="STRUCK_OFF">Radiée</option>
              <option value="UNKNOWN">Indéterminée</option>
            </Select>
          </Field>
          <Field id="sourceRef" label="Source de la consultation" hint="Référence de l'extrait, du guichet ou du courrier consulté. Elle est conservée avec la vérification.">
            <Input id="sourceRef" required minLength={3} value={form.sourceRef} onChange={(e) => set("sourceRef")(e.target.value)} data-control-id="CCI_REGISTRY_SOURCE" />
          </Field>
          <Field id="registryDecision" label="Conclusion de l'instruction"><Select id="registryDecision" data-control-id="CCI_REGISTRY_DECISION" value={form.decision} onChange={(e) => set("decision")(e.target.value)}><option value="CONFIRMED">Confirmer la correspondance</option><option value="DIVERGENT">Signaler une divergence</option><option value="NEEDS_INFO">Demander un complément</option><option value="REFUSED">Refuser</option></Select></Field>
          <Field id="registryReason" label="Motif (obligatoire hors confirmation)"><Input id="registryReason" data-control-id="CCI_REGISTRY_REASON" maxLength={2000} value={form.reason} onChange={(e) => set("reason")(e.target.value)} /></Field>
        </>
      ) : null}
      <Actions>
        <Button controlId="CCI_REGISTRY_SUBMIT" type="submit" state={busy ? "loading" : "default"}>
          Enregistrer la vérification
        </Button>
      </Actions>
    </form>
  );
}
