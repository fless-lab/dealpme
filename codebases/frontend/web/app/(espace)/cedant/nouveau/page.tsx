"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Field, Input, Panel, Select, StateBanner } from "@dealpme/ui";
import { BAND_LABEL, REGION_LABEL, SECTORS } from "../../../../lib/dossier";

const LEGAL_FORMS = ["SA", "SARL", "SAS", "SNC", "SCS", "GIE", "SOCIETE_CIVILE", "AUTRE"];

/**
 * Étape 1 de l'assistant : le type de cession. C'est le choix qui commande tout le reste, et il est
 * définitif (le serveur le rend immuable). L'écran le dit avant la validation, pas après.
 */
export default function NewDossierPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    dealType: "ASSET_DEAL",
    legalName: "",
    legalForm: "SARL",
    rccmNumber: "",
    sectorCode: "AGRO",
    regionCode: "GRAND_LOME",
    turnoverBand: "FROM_50M_TO_250M",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/dossier/nouveau", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = (await res.json()) as { ok: boolean; dealId?: string; message?: string };
    setBusy(false);
    if (data.ok && data.dealId) {
      router.push(`/cedant/${data.dealId}/activite`);
      return;
    }
    setError(data.message ?? "Création impossible.");
  }

  const isShare = form.dealType === "SHARE_DEAL";

  return (
    <div className="dp-stack" style={{ maxWidth: 780 }}>
      <div>
        <h1>Commencer un dossier</h1>
        <p className="dp-muted">
          Ces informations décrivent l'entreprise et la nature de l'opération. Elles ne sont pas publiées telles
          quelles : seuls le secteur, la région et la tranche de chiffre d'affaires apparaissent aux repreneurs.
        </p>
      </div>
      {error ? <StateBanner tone="danger" title="Création refusée" controlId="SELLER_NEW_ERROR">{error}</StateBanner> : null}
      <form onSubmit={submit} noValidate>
        <Panel title="Nature de l'opération" controlId="SELLER_NEW_TYPE">
          <Field id="dealType" label="Que cédez-vous" hint="Ce choix est définitif : il détermine les pièces attendues et le régime de confidentialité applicable.">
            <Select id="dealType" value={form.dealType} onChange={(e) => set("dealType")(e.target.value)} data-control-id="SELLER_NEW_DEAL_TYPE">
              <option value="ASSET_DEAL">Des actifs : fonds de commerce, matériel, contrats</option>
              <option value="SHARE_DEAL">Des titres : actions ou parts sociales de la société</option>
            </Select>
          </Field>
          {isShare ? (
            <StateBanner tone="warning" title="Cession de titres : diffusion encadrée" controlId="SELLER_NEW_SHARE_NOTICE">
              Une cession de titres ne peut pas être proposée au public. Le dossier se prépare normalement, mais sa
              diffusion reste limitée à un cercle restreint admis par le service de conformité. La publication ouverte
              est refusée par la plateforme, et cette limite protège la validité de l'opération.
            </StateBanner>
          ) : null}
        </Panel>

        <Panel title="L'entreprise" controlId="SELLER_NEW_COMPANY">
          <Field id="legalName" label="Raison sociale">
            <Input id="legalName" required minLength={2} value={form.legalName} onChange={(e) => set("legalName")(e.target.value)} data-control-id="SELLER_NEW_LEGAL_NAME" />
          </Field>
          <Field id="legalForm" label="Forme juridique">
            <Select id="legalForm" value={form.legalForm} onChange={(e) => set("legalForm")(e.target.value)} data-control-id="SELLER_NEW_LEGAL_FORM">
              {LEGAL_FORMS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="rccm" label="Numéro RCCM (facultatif à ce stade)" hint="La CCI-Togo vérifiera l'inscription au registre avant toute certification.">
            <Input id="rccm" value={form.rccmNumber} onChange={(e) => set("rccmNumber")(e.target.value)} data-control-id="SELLER_NEW_RCCM" />
          </Field>
        </Panel>

        <Panel title="Ce qui sera visible des repreneurs" controlId="SELLER_NEW_PUBLIC">
          <Field id="sector" label="Secteur">
            <Select id="sector" value={form.sectorCode} onChange={(e) => set("sectorCode")(e.target.value)} data-control-id="SELLER_NEW_SECTOR">
              {SECTORS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="region" label="Région">
            <Select id="region" value={form.regionCode} onChange={(e) => set("regionCode")(e.target.value)} data-control-id="SELLER_NEW_REGION">
              {Object.entries(REGION_LABEL).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="band" label="Tranche de chiffre d'affaires" hint="Une tranche, jamais le montant exact : le chiffre précis n'est communiqué qu'après signature d'un accord de confidentialité.">
            <Select id="band" value={form.turnoverBand} onChange={(e) => set("turnoverBand")(e.target.value)} data-control-id="SELLER_NEW_BAND">
              {Object.entries(BAND_LABEL).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </Panel>

        <Actions>
          <Button controlId="SELLER_NEW_SUBMIT" type="submit" state={busy ? "loading" : "default"}>
            Créer le dossier
          </Button>
          <a className="dp-btn dp-btn-ghost" href="/cedant" data-control-id="SELLER_NEW_CANCEL">
            Annuler
          </a>
        </Actions>
      </form>
    </div>
  );
}
