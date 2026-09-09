import { colors } from "../tokens.js";

/**
 * WarningStrip : bandeau d'avertissement permanent, non fermable, pour les mentions obligatoires
 * (données synthétiques, "déclaré non audité", "indicatif non opposable", "aide à la rédaction").
 */
export function WarningStrip({ text, controlId = "WARNING_STRIP" }: { text: string; controlId?: string }) {
  return (
    <div
      data-control-id={controlId}
      style={{ background: colors.marineEncre, color: colors.papier, fontSize: "0.8rem", letterSpacing: "0.04em", padding: "0.4rem 1rem", textAlign: "center" }}
    >
      {text}
    </div>
  );
}
