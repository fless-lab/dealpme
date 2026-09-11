import type { ReactNode } from "react";
import { ServiceNav } from "@dealpme/ui";
import { headers } from "next/headers";
import { requireRole } from "../../../lib/guards";

const NAV = [
  { href: "/investisseur", label: "Mes intérêts", controlId: "INV_NAV_INTERESTS" },
  { href: "/investisseur/alertes", label: "Mes alertes", controlId: "INV_NAV_ALERTS" },
  { href: "/opportunites", label: "Rechercher", controlId: "INV_NAV_SEARCH" },
];

/** Espace investisseur : intérêts manifestés et alertes enregistrées. */
export default async function InvestorLayout({ children }: { children: ReactNode }) {
  await requireRole("INVESTOR", "INVESTOR_DIASPORA", "BANK", "ADVISOR");
  const pathname = (await headers()).get("x-chemin") ?? "";
  return (
    <ServiceNav nav={NAV} pathname={pathname}>
      {children}
    </ServiceNav>
  );
}
