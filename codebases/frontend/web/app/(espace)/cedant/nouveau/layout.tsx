import type { ReactNode } from "react";

/** Titre d'onglet pour un écran rendu côté client : la page elle-même ne peut pas l'exporter. */
export const metadata = { title: "Commencer un dossier", description: "Nature de l'opération et informations publiées." };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
