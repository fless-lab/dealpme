import { notFound } from "next/navigation";
import { Panel, StateBanner } from "@dealpme/ui";
import { api } from "../../../../../lib/api";
import { requireRole } from "../../../../../lib/guards";
import { STEP_BY_SLUG, type Dossier } from "../../../../../lib/dossier";
import { FactForm } from "./fact-form";
import { DocumentsPanel } from "./documents-panel";
import { IdentityPanel } from "./identity-panel";

/** Une étape de l'assistant. Les exigences affichées viennent du serveur : l'écran ne décide de rien. */
export default async function StepPage({ params }: { params: Promise<{ dealId: string; step: string }> }) {
  const { dealId, step } = await params;
  const definition = STEP_BY_SLUG.get(step);
  if (!definition) notFound();
  const { token } = await requireRole("SELLER", "ADVISOR");
  const dossier = await api<Dossier>(`/deals/${dealId}/dossier`, { token });

  const requirements = dossier.requirements.filter((r) => r.step === definition.id);
  const factRequirements = requirements.filter((r) => r.kind === "fact");
  const documentRequirements = requirements.filter((r) => r.kind === "document");
  const readOnly = dossier.status !== "DRAFT";

  return (
    <div className="dp-stack">
      <div>
        <h1>{definition.label}</h1>
        <p className="dp-muted">{definition.help}</p>
      </div>

      {dossier.lastReturn ? (
        <StateBanner tone="warning" title="Dossier renvoyé en préparation par la CCI-Togo" controlId="SELLER_STEP_RETURNED">
          {dossier.lastReturn.reason}
        </StateBanner>
      ) : null}

      {readOnly ? (
        <StateBanner tone="info" title="Dossier soumis à vérification" controlId="SELLER_STEP_READONLY">
          Le dossier n'est plus modifiable pendant l'instruction de la CCI-Togo. Les valeurs et les pièces restent
          consultables ; une correction crée une nouvelle version dès que le dossier revient en préparation.
        </StateBanner>
      ) : null}

      {definition.id === "IDENTITE" ? <IdentityPanel dossier={dossier} /> : null}

      {factRequirements.length > 0 ? (
        <Panel title="Informations demandées" controlId="SELLER_STEP_FACTS">
          <p className="dp-muted" style={{ marginTop: 0 }}>
            Chaque valeur est enregistrée avec sa source et sa date. Une correction ne remplace pas la précédente :
            elle crée une version, et l'historique reste consultable. C'est ce qui permet d'afficher
            "déclaré, non audité" sans que la formule soit creuse.
          </p>
          {factRequirements.map((r) => (
            <FactForm
              key={r.key}
              dealId={dealId}
              requirement={r}
              current={dossier.facts.find((f) => f.fieldKey === r.key) ?? null}
              readOnly={readOnly}
            />
          ))}
        </Panel>
      ) : null}

      {documentRequirements.length > 0 ? (
        <DocumentsPanel dealId={dealId} requirements={documentRequirements} documents={dossier.documents} readOnly={readOnly} />
      ) : null}
    </div>
  );
}
