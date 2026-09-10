"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Field, Input, Select, StateBanner } from "@dealpme/ui";

const FORMS = ["SA", "SARL", "SAS", "SNC", "SCS", "GIE", "SOCIETE_CIVILE", "AUTRE"];

/**
 * Vérification RCCM / CFE. En mode manuel, l'officier reporte ce qu'il a lu au registre et indique
 * la source de sa consultation : le résultat est enregistré séparément des données déclarées.
 */
export function RegistryVerification({ companyId, declaredName, declaredForm, declaredRccm, manual }: { companyId: string; declaredName: string; declaredForm: string; declaredRccm: string | null; manual: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ rccmNumber: declaredRccm ?? "", legalName: declaredName, legalForm: declaredForm, status: "ACTIVE", sourceRef: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      companyId,
      rccmNumber: form.rccmNumber,
      legalForm: form.legalForm,
      ...(manual ? { manualResult: { legalName: form.legalName, legalForm: form.legalForm, status: form.status, sourceRef: form.sourceRef } } : {}),
    };
    const res = await fetch("/api/institution/registry-verifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (data.ok) {
      router.refresh();
      return;
    }
    setError(data.message ?? "Vérification impossible.");
  }

  return (
    <form onSubmit={submit} noValidate>
      {error ? <StateBanner tone="danger" title="Vérification refusée" controlId="CCI_REGISTRY_ERROR">{error}</StateBanner> : null}
      <Field id="rccm" label="Numéro RCCM consulté">
        <Input id="rccm" required minLength={3} maxLength={64} value={form.rccmNumber} onChange={(e) => set("rccmNumber")(e.target.value)} data-control-id="CCI_REGISTRY_RCCM" />
      </Field>
      {manual ? (
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
