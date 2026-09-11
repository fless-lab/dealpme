import type { ReactNode } from "react";

/** Titre d'onglet pour un écran rendu côté client : la page elle-même ne peut pas l'exporter. */
export const metadata = { title: "Créer un compte", description: "Inscription des cédants, repreneurs et conseils." };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
