import type { CSSProperties, ReactNode } from "react";
import { colors } from "../tokens.js";

export type BannerTone = "info" | "success" | "warning" | "danger";

const tones: Record<BannerTone, { bg: string; fg: string; border: string }> = {
  info: { bg: "#E7E8F7", fg: colors.marineEncre, border: "#C9CCE9" },
  success: { bg: "#E9F2EC", fg: colors.verifie, border: "#BFD9C8" },
  warning: { bg: "#FBF1E3", fg: colors.enCours, border: "#EAD3A8" },
  danger: { bg: "#F7ECEC", fg: colors.retire, border: "#E5C2C2" },
};

/**
 * StateBanner : état d'un dossier ou d'un écran (vide, chargement, bloqué, erreur). Chaque écran doit
 * posséder ses états vide / chargement / erreur (definition of done du corpus V3.1).
 */
export function StateBanner({ tone = "info", title, children, controlId }: { tone?: BannerTone; title: string; children?: ReactNode; controlId?: string }) {
  const t = tones[tone];
  const style: CSSProperties = { background: t.bg, color: t.fg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.92rem" };
  return (
    <div role="status" style={style} data-control-id={controlId}>
      <strong style={{ display: "block", marginBottom: children ? 4 : 0 }}>{title}</strong>
      {children}
    </div>
  );
}
