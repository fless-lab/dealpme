import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ContextBar, StatusBadge, Workspace } from "@dealpme/ui";
import { api, ApiError } from "../../../../lib/api";
import { requireRole } from "../../../../lib/guards";
import { DEAL_STATUS_LABEL, STEPS, type Dossier } from "../../../../lib/dossier";

/**
 * Assistant du dossier cédant : une étape par écran, la complétude visible en permanence.
 * Les étapes ne sont pas verrouillées les unes après les autres : le cédant revient où il veut,
 * et c'est la liste des manques, pas l'ordre de saisie, qui commande la soumission.
 */
export default async function DossierLayout({ children, params }: { children: ReactNode; params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const { token } = await requireRole("SELLER", "ADVISOR");
  let dossier: Dossier;
  try {
    dossier = await api<Dossier>(`/deals/${dealId}/dossier`, { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const missingByStep = new Map<string, number>();
  for (const m of dossier.completeness.missing) missingByStep.set(m.step, (missingByStep.get(m.step) ?? 0) + 1);

  const nav = STEPS.map((s) => ({
    href: `/cedant/${dealId}/${s.slug}`,
    label: missingByStep.get(s.id) ? `${s.label} (${missingByStep.get(s.id)})` : s.label,
    controlId: `SELLER_STEP_${s.id}`,
  })).concat([
    { href: `/cedant/${dealId}/recapitulatif`, label: "Récapitulatif", controlId: "SELLER_STEP_SUMMARY" },
    { href: `/cedant/${dealId}/certification`, label: "Certification", controlId: "SELLER_STEP_CERTIFICATION" },
    { href: `/cedant/${dealId}/audience`, label: "Audience", controlId: "SELLER_STEP_AUDIENCE" },
  ]);

  return (
    <>
      <ContextBar
        crumbs={[
          { label: "Mes dossiers", href: "/cedant" },
          { label: dossier.dealType === "ASSET_DEAL" ? "Cession d'actifs" : "Cession de titres" },
        ]}
      >
        <span>
          <StatusBadge status={dossier.status === "DRAFT" ? "neutral" : dossier.status === "PENDING_VERIFICATION" ? "pending" : "verified"} label={DEAL_STATUS_LABEL[dossier.status] ?? dossier.status} controlId="SELLER_DOSSIER_STATUS" />
          <span className="dp-muted" style={{ marginLeft: 12 }}>
            {dossier.completeness.complete ? "Dossier complet" : `${dossier.completeness.missing.length} élément(s) manquant(s)`}
          </span>
        </span>
      </ContextBar>
      <Workspace nav={nav} ariaLabel="Étapes du dossier">
        {children}
      </Workspace>
    </>
  );
}
