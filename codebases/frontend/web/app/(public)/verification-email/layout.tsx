import type { ReactNode } from "react";

/** Titre d'onglet pour un écran rendu côté client : la page elle-même ne peut pas l'exporter. */
export const metadata = { title: "Vérification de l'adresse email", description: "Confirmez votre adresse avant la première connexion." };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
