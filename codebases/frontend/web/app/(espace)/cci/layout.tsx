import type { ReactNode } from "react";
import { ServiceNav } from "@dealpme/ui";
import { requireRole } from "../../../lib/guards";

const NAV = [
  { href: "/cci", label: "Tableau de bord", controlId: "CCI_NAV_OVERVIEW" },
  { href: "/cci/adhesions", label: "Adhésions", controlId: "CCI_NAV_MEMBERSHIPS" },
  { href: "/cci/entreprises", label: "Entreprises", controlId: "CCI_NAV_COMPANIES" },
  { href: "/cci/certifications", label: "Journal des certifications", controlId: "CCI_NAV_CERTIFICATIONS" },
];

/** Console CCI-Togo : réservée aux officiers. Rôles et journal séparés du back-office plateforme (DP-GOV). */
export default async function CciLayout({ children }: { children: ReactNode }) {
  await requireRole("CCI_OFFICER");
  return <ServiceNav nav={NAV}>{children}</ServiceNav>;
}
