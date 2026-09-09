import type { ReactNode } from "react";
import { colors } from "../tokens.js";

/**
 * DecisionGate : cadre d'une décision humaine (admission au cercle, certification Deal-Ready).
 * Le nom du décideur est toujours affiché : aucune décision n'est présentée comme automatique.
 */
export function DecisionGate({ title, decidedBy, decidedAt, children, controlId }: { title: string; decidedBy: string | null; decidedAt: string | null; children?: ReactNode; controlId: string }) {
  return (
    <section data-control-id={controlId} style={{ border: `1px solid ${colors.acier}`, borderLeft: `4px solid ${colors.marineEncre}`, borderRadius: 8, padding: "0.9rem 1.1rem", background: colors.blanc }}>
      <h3 style={{ fontSize: "1.05rem" }}>{title}</h3>
      <p style={{ margin: "0.3rem 0 0.6rem", fontSize: "0.85rem", color: colors.acier }}>
        {decidedBy ? `Décision de ${decidedBy}${decidedAt ? ` le ${decidedAt}` : ""}` : "Décision humaine en attente"}
      </p>
      {children}
    </section>
  );
}
