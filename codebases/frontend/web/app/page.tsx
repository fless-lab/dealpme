import { Metric, Metrics, PermissionLens, TransactionRail } from "@dealpme/ui";
import { getSession } from "../lib/session";

const STAGES = [
  { id: "INTERESTED", label: "Intérêt" },
  { id: "QUALIFIED", label: "Qualification" },
  { id: "ADMITTED", label: "Admission" },
  { id: "NDA", label: "NDA" },
  { id: "T2", label: "T2" },
  { id: "VDR", label: "Data room" },
  { id: "LOI", label: "LOI" },
  { id: "DUE_DILIGENCE", label: "Audit" },
  { id: "OUTCOME", label: "Résultat" },
];

export default async function HomePage() {
  const session = await getSession();
  return (
    <div className="dp-stack">
      <section>
        <p className="dp-label">Transmission et reprise de PME, zone OHADA</p>
        <h1 style={{ fontSize: "2.2rem" }}>Là où les entreprises changent de mains.</h1>
        <p style={{ maxWidth: "62ch" }}>
          DealPME vérifie les acteurs, prépare les dossiers, met en relation sous confidentialité contrôlée et orchestre la transaction avec des professionnels. La
          certification Deal-Ready est décidée par la CCI-Togo.
        </p>
        {!session ? (
          <div className="dp-actions">
            <a className="dp-btn dp-btn-primary" href="/inscription" data-control-id="HOME_REGISTER">
              Créer un compte
            </a>
            <a className="dp-btn dp-btn-secondary" href="/opportunites" data-control-id="HOME_BROWSE">
              Voir les opportunités
            </a>
          </div>
        ) : null}
      </section>
      <Metrics>
        <Metric label="Cessions d'actifs publiées" value="3" note="Jeu de démonstration" />
        <Metric label="Dossiers en préparation" value="1" />
        <Metric label="Certifications Deal-Ready" value="1" note="Décidées par la CCI-Togo" />
      </Metrics>
      <section className="dp-panel dp-stack">
        <p className="dp-label">Parcours d'une transaction</p>
        <TransactionRail stages={STAGES} current="INTERESTED" />
        <PermissionLens model={{ tier: "T0", state: "granted", reason: "Existence de l'opportunité : secteur, région, tranche de chiffre d'affaires. L'identité et le prix exigent un NDA." }} />
      </section>
    </div>
  );
}
