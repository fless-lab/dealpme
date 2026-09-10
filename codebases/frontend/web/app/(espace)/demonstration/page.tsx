import { Panel, StateBanner, WarningStrip } from "@dealpme/ui";
import { api } from "../../../lib/api";
import { requireRole } from "../../../lib/guards";
import { Scenario } from "./scenario";

interface ScenarioState {
  label: string;
  deal: { id: string; status: string; visibility: string; dealType: string; createdAt: string };
  circle: { disclosureCount: number; cap: number; admissionRequired: boolean };
  maxTierWithoutAdmission: string;
  publicView: Record<string, unknown>;
  circleView: Record<string, unknown>;
  withheldAtT1: string[];
  shareDealListingEnabled: boolean;
}

/**
 * Démonstration du blocage réglementaire (P07, P10). Rien n'est simulé : le dossier vient du jeu de
 * démonstration, les projections passent par l'allow-list du serveur, et la tentative de publication
 * reçoit le vrai refus. Le journal montré est le journal d'audit, qui est append-only.
 */
export default async function DemonstrationPage() {
  const { token } = await requireRole("SELLER", "ADVISOR", "CCI_OFFICER", "COMPLIANCE_OPERATOR", "PLATFORM_ADMIN");
  let state: ScenarioState | null = null;
  let error: string | null = null;
  try {
    state = await api<ScenarioState>("/demonstration/rps", { token });
  } catch {
    error = "Le jeu de démonstration ne contient aucun dossier de cession de titres. Chargez les données de démonstration.";
  }

  return (
    <div className="dp-stack">
      <WarningStrip text={state?.label ?? "Données de démonstration : synthétiques, jamais réelles"} />
      <div>
        <h1>Pourquoi une cession de titres ne se publie pas</h1>
        <p className="dp-muted" style={{ maxWidth: "70ch" }}>
          Proposer des titres de société au public sans y être autorisé expose l'opération à la nullité. La plupart des
          plateformes traitent cette règle comme une consigne à respecter. DealPME en fait une limite technique : la
          publication est refusée par le serveur, et le refus laisse une trace.
        </p>
      </div>

      {error ? <StateBanner tone="warning" title="Scénario indisponible" controlId="DEMO_ERROR">{error}</StateBanner> : null}
      {state ? <Scenario state={state} /> : null}

      <Panel title="Ce que la démonstration ne montre pas encore" controlId="DEMO_LIMITS">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Le circuit d'admission au cercle restreint, avec sa décision humaine et son plafond effectif, arrive en V2.</li>
          <li>Le compteur de divulgation est ici à zéro : il sera tenu par le service RPS, seul autorisé à l'incrémenter.</li>
          <li>Le journal réglementaire à chaîne de hachage et l'export du pack de preuves arrivent avec ce même circuit.</li>
        </ul>
        <p className="dp-muted" style={{ marginBottom: 0 }}>
          Ce qui fonctionne aujourd'hui est le blocage lui-même, ses paliers de divulgation et sa traçabilité.
        </p>
      </Panel>
    </div>
  );
}
