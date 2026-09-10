"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Checkbox, Field, Panel, Select } from "@dealpme/ui";
import { BAND_LABEL, REGION_LABEL, SECTORS } from "../../lib/dossier";

/** Filtres de recherche : uniquement des champs du palier T0, ceux que le serveur accepte. */
export function Filters({ current }: { current: Record<string, string | undefined> }) {
  const router = useRouter();
  const [form, setForm] = useState({
    sectorCode: current["sectorCode"] ?? "",
    regionCode: current["regionCode"] ?? "",
    turnoverBand: current["turnoverBand"] ?? "",
    dealReadyOnly: current["dealReadyOnly"] === "1",
  });
  const set = (k: keyof typeof form) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    if (form.sectorCode) q.set("sectorCode", form.sectorCode);
    if (form.regionCode) q.set("regionCode", form.regionCode);
    if (form.turnoverBand) q.set("turnoverBand", form.turnoverBand);
    if (form.dealReadyOnly) q.set("dealReadyOnly", "1");
    router.push(q.toString() ? `/opportunites?${q.toString()}` : "/opportunites");
  }

  function reset() {
    setForm({ sectorCode: "", regionCode: "", turnoverBand: "", dealReadyOnly: false });
    router.push("/opportunites");
  }

  return (
    <Panel title="Rechercher" controlId="OPP_FILTERS">
      <form onSubmit={submit} noValidate>
        <div className="dp-grid">
          <Field id="f-sector" label="Secteur">
            <Select id="f-sector" value={form.sectorCode} onChange={(e) => set("sectorCode")(e.target.value)} data-control-id="OPP_FILTER_SECTOR">
              <option value="">Tous les secteurs</option>
              {SECTORS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="f-region" label="Région">
            <Select id="f-region" value={form.regionCode} onChange={(e) => set("regionCode")(e.target.value)} data-control-id="OPP_FILTER_REGION">
              <option value="">Toutes les régions</option>
              {Object.entries(REGION_LABEL).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="f-band" label="Tranche de chiffre d'affaires">
            <Select id="f-band" value={form.turnoverBand} onChange={(e) => set("turnoverBand")(e.target.value)} data-control-id="OPP_FILTER_BAND">
              <option value="">Toutes les tranches</option>
              {Object.entries(BAND_LABEL).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Checkbox
          id="f-ready"
          label="Uniquement les entreprises certifiées Deal-Ready par la CCI-Togo"
          checked={form.dealReadyOnly}
          onChange={(e) => set("dealReadyOnly")(e.target.checked)}
          data-control-id="OPP_FILTER_READY"
        />
        <Actions>
          <Button controlId="OPP_FILTER_SUBMIT" type="submit">
            Rechercher
          </Button>
          <Button controlId="OPP_FILTER_RESET" type="button" variant="ghost" onClick={reset}>
            Réinitialiser
          </Button>
        </Actions>
      </form>
    </Panel>
  );
}
