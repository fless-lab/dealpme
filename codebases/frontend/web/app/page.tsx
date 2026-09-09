import { PermissionLens, TransactionRail } from "@dealpme/ui";

export default function HomePage() {
  return (
    <div style={{ display: "grid", gap: "1.4rem" }}>
      <section>
        <p className="dp-label">Transmission et reprise de PME, zone OHADA</p>
        <h1 style={{ fontSize: "2.2rem" }}>Là où les entreprises changent de mains.</h1>
        <p style={{ maxWidth: "62ch" }}>
          DealPME vérifie les acteurs, prépare les dossiers, met en relation sous confidentialité contrôlée et orchestre la
          transaction avec des professionnels. La certification Deal-Ready est décidée par la CCI-Togo.
        </p>
      </section>
      <section className="dp-card" style={{ display: "grid", gap: "0.8rem" }}>
        <p className="dp-label">Parcours d'une transaction</p>
        <TransactionRail current="Intérêt" />
        <PermissionLens tier="T0" />
      </section>
    </div>
  );
}
