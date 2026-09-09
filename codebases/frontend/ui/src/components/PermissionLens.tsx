import { colors } from "../tokens.js";

export type Tier = "T0" | "T1" | "T2";

const labels: Record<Tier, string> = {
  T0: "Existence : secteur, région, taille",
  T1: "Teaser anonymisé : sans identité ni prix",
  T2: "Complet : identité, prix, data room (après NDA)",
};

/**
 * PermissionLens : rend visible le palier de divulgation courant. Purement informatif :
 * la projection des champs est faite par le serveur, jamais par ce composant.
 */
export function PermissionLens({ tier, controlId = "PERMISSION_LENS" }: { tier: Tier; controlId?: string }) {
  return (
    <div data-control-id={controlId} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${colors.acier}`, borderRadius: 999, padding: "0.25rem 0.7rem", fontSize: "0.8rem", color: colors.marineEncre }}>
      <span style={{ fontWeight: 700 }}>{tier}</span>
      <span style={{ color: colors.acier }}>{labels[tier]}</span>
    </div>
  );
}
