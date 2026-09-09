import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { AppShell, WarningStrip } from "@dealpme/ui";
import { fr } from "@dealpme/i18n";
import "./globals.css";

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-barlow-condensed" });

export const metadata: Metadata = {
  title: "DealPME",
  description: "Là où les entreprises changent de mains.",
};

const NAV = [
  { href: "/", label: "Accueil", controlId: "NAV_HOME" },
  { href: "/opportunites", label: "Opportunités", controlId: "NAV_OPPORTUNITIES" },
  { href: "/cedant", label: "Espace cédant", controlId: "NAV_SELLER" },
  { href: "/investisseur", label: "Espace investisseur", controlId: "NAV_INVESTOR" },
  { href: "/cci", label: "Console CCI-Togo", controlId: "NAV_CCI" },
];

/** Français langue source : lang="fr" sur la racine ; l'anglais sera une dérivation, jamais l'inverse. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <AppShell nav={NAV} banner={<WarningStrip text={fr.common.syntheticDataBanner} />}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
