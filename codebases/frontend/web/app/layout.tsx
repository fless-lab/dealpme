import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Barlow_Condensed, Inter } from "next/font/google";
import { fr } from "@dealpme/i18n";
import { AppShell, WarningStrip } from "@dealpme/ui";
import { getSession, navFor, ROLE_LABEL } from "../lib/session";
import { AccountMenu } from "./account-menu";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-barlow-condensed" });

export const metadata: Metadata = {
  title: "DealPME",
  description: "Là où les entreprises changent de mains.",
  robots: { index: false, follow: false },
};

const PUBLIC_NAV = [
  { href: "/opportunites", label: "Opportunités", controlId: "NAV_OPPORTUNITIES" },
  { href: "/evenements", label: "Deal-Connect", controlId: "NAV_EVENTS" },
];

/** Français langue source : lang="fr" sur la racine. La navigation dépend du rôle, mais n'est jamais la frontière de sécurité. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const nav = session ? navFor(session.me.roles) : PUBLIC_NAV;
  return (
    <html lang="fr" className={`${inter.variable} ${barlowCondensed.variable}`}>
      <body>
        <AppShell
          nav={nav}
          strip={<WarningStrip text={fr.common.syntheticDataBanner} />}
          account={
            session ? (
              <AccountMenu email={session.me.email} role={session.me.roles.map((r) => ROLE_LABEL[r] ?? r).join(", ")} />
            ) : (
              <a className="dp-btn dp-btn-secondary" href="/connexion" data-control-id="NAV_LOGIN">
                Se connecter
              </a>
            )
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
