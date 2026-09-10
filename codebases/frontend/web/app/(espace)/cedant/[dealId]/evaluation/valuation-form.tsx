"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Actions, Button, Field, Input, Panel, StateBanner, Textarea } from "@dealpme/ui";

interface Restatement {
  label: string;
  amountXof: string;
  justification: string;
}

/**
 * Saisie des données minimales et des retraitements. Chaque retraitement porte sa justification :
 * un ajustement sans motif rend la fourchette invérifiable, donc le serveur l'exige.
 */
export function ValuationForm({
  dealId,
  declared,
  multiples,
}: {
  dealId: string;
  declared: { ebitdaXof: number | null; netDebtXof: number | null; periodLabel: string | null };
  multiples: { low: number; high: number; source: string; asOf: string };
}) {
  const router = useRouter();
  const [ebitda, setEbitda] = useState(declared.ebitdaXof ? String(declared.ebitdaXof) : "");
  const [netDebt, setNetDebt] = useState(declared.netDebtXof ? String(declared.netDebtXof) : "");
  const [restatements, setRestatements] = useState<Restatement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const num = (v: string) => Number(v.replace(/[^\d-]/g, ""));

  function update(i: number, patch: Partial<Restatement>) {
    setRestatements((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ebitdaXof = num(ebitda);
    const netDebtXof = num(netDebt);
    if (!Number.isFinite(ebitdaXof) || ebitdaXof <= 0) {
      setError("Saisissez un excédent brut d'exploitation en FCFA, sans décimale.");
      return;
    }
    const incomplete = restatements.find((r) => r.label.trim().length < 2 || r.justification.trim().length < 3);
    if (incomplete) {
      setError("Chaque retraitement doit porter un libellé et sa justification.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/marketplace/valuations/${dealId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId,
        ebitdaXof,
        netDebtXof: Number.isFinite(netDebtXof) ? netDebtXof : 0,
        restatements: restatements.map((r) => ({ label: r.label.trim(), amountXof: num(r.amountXof), justification: r.justification.trim() })),
      }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string };
    setBusy(false);
    if (data.ok) {
      router.refresh();
      return;
    }
    setError(data.message ?? "Calcul impossible.");
  }

  return (
    <Panel title="Données de calcul" controlId="SELLER_VAL_FORM">
      <form onSubmit={submit} noValidate>
        {error ? <StateBanner tone="danger" title="Calcul refusé" controlId="SELLER_VAL_ERROR">{error}</StateBanner> : null}
        {declared.ebitdaXof ? (
          <p className="dp-muted" style={{ marginTop: 0 }}>
            Valeurs reprises de votre dossier{declared.periodLabel ? ` (exercice ${declared.periodLabel})` : ""}. Vous
            pouvez les ajuster ici sans modifier le dossier.
          </p>
        ) : (
          <StateBanner tone="info" title="Aucun chiffre déclaré dans le dossier" controlId="SELLER_VAL_NO_FACTS">
            Renseignez l'excédent brut d'exploitation et la dette nette dans l'étape Finances : ils serviront de point
            de départ ici.
          </StateBanner>
        )}
        <div className="dp-grid">
          <Field id="ebitda" label="Excédent brut d'exploitation en FCFA" hint="Montant entier, sans décimale.">
            <Input id="ebitda" inputMode="numeric" required value={ebitda} onChange={(e) => setEbitda(e.target.value)} data-control-id="SELLER_VAL_EBITDA" />
          </Field>
          <Field id="netdebt" label="Dette nette en FCFA" hint="Dettes financières moins trésorerie disponible.">
            <Input id="netdebt" inputMode="numeric" value={netDebt} onChange={(e) => setNetDebt(e.target.value)} data-control-id="SELLER_VAL_NETDEBT" />
          </Field>
        </div>

        <p className="dp-label" style={{ marginTop: 16 }}>Retraitements</p>
        <p className="dp-muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
          Charges ou produits non récurrents à neutraliser : rémunération du dirigeant au-delà du marché, loyer d'un
          local détenu en propre, litige exceptionnel. Un montant négatif diminue l'excédent retraité.
        </p>
        {restatements.map((r, i) => (
          <div key={i} className="dp-grid" style={{ borderTop: "1px solid var(--dp-line)", paddingTop: 12, marginTop: 12 }}>
            <Field id={`rl-${i}`} label="Libellé">
              <Input id={`rl-${i}`} value={r.label} onChange={(e) => update(i, { label: e.target.value })} data-control-id="SELLER_VAL_REST_LABEL" />
            </Field>
            <Field id={`ra-${i}`} label="Montant en FCFA">
              <Input id={`ra-${i}`} inputMode="numeric" value={r.amountXof} onChange={(e) => update(i, { amountXof: e.target.value })} data-control-id="SELLER_VAL_REST_AMOUNT" />
            </Field>
            <Field id={`rj-${i}`} label="Justification">
              <Textarea id={`rj-${i}`} rows={2} value={r.justification} onChange={(e) => update(i, { justification: e.target.value })} data-control-id="SELLER_VAL_REST_JUSTIF" />
            </Field>
          </div>
        ))}

        <Actions>
          <Button controlId="SELLER_VAL_ADD" type="button" variant="ghost" onClick={() => setRestatements((p) => [...p, { label: "", amountXof: "", justification: "" }])}>
            Ajouter un retraitement
          </Button>
          <Button controlId="SELLER_VAL_SUBMIT" type="submit" state={busy ? "loading" : "default"}>
            Calculer la fourchette
          </Button>
        </Actions>

        <p className="dp-muted" style={{ marginBottom: 0, fontSize: "0.82rem" }}>
          Multiples appliqués : {multiples.low}x à {multiples.high}x. Source : {multiples.source}, au {multiples.asOf}.
        </p>
      </form>
    </Panel>
  );
}
