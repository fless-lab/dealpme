import type { ReactNode } from "react";
import { colors } from "../tokens.js";

export interface NavItem {
  href: string;
  label: string;
  controlId: string;
}

/**
 * AppShell : gabarit applicatif (en-tête navy, navigation, contenu). Chaque contrôle visible porte un data-control-id
 * enregistré dans le registre d'interactions : un contrôle sans contrat est un bloqueur de release.
 */
export function AppShell({ brand = "DealPME", nav, banner, children }: { brand?: string; nav: NavItem[]; banner?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {banner}
      <header style={{ background: colors.marineEncre, color: colors.blanc, padding: "0.8rem 1.4rem", display: "flex", alignItems: "center", gap: "1.6rem" }}>
        <span style={{ fontFamily: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif', fontWeight: 700, fontSize: "1.3rem", letterSpacing: "0.01em" }}>{brand}</span>
        <nav aria-label="Navigation principale" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {nav.map((n) => (
            <a key={n.href} href={n.href} data-control-id={n.controlId} style={{ color: "#D7DAF0", textDecoration: "none", fontSize: "0.92rem" }}>
              {n.label}
            </a>
          ))}
        </nav>
      </header>
      <main style={{ flex: 1, maxWidth: 1180, width: "100%", margin: "0 auto", padding: "1.6rem" }}>{children}</main>
    </div>
  );
}
