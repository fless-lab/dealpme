import type { ReactNode } from "react";
import { requireRole } from "../../../lib/guards";

/** Espace cédant : dossier, préparation, publication. Réservé au cédant et à ses conseils. */
export default async function CedantLayout({ children }: { children: ReactNode }) {
  await requireRole("SELLER", "ADVISOR");
  return <>{children}</>;
}
