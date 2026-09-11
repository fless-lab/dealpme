import type { ReactNode } from "react";

/** Titre d'onglet pour un écran rendu côté client : la page elle-même ne peut pas l'exporter. */
export const metadata = { title: "Connexion", description: "Accédez à votre espace DealPME." };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
