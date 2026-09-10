import { redirect } from "next/navigation";
import { getSession, type Me } from "./session";

/**
 * Garde d'espace : la navigation dépend du rôle, mais elle n'est jamais la frontière de sécurité.
 * Chaque page d'espace revérifie la session côté serveur ; l'API refuse de toute façon un rôle non autorisé.
 * Un rôle insuffisant renvoie vers l'accueil, jamais vers une page d'erreur qui révélerait l'existence de l'espace.
 */
export async function requireRole(...roles: string[]): Promise<{ token: string; me: Me }> {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (roles.length > 0 && !roles.some((r) => session.me.roles.includes(r))) redirect("/");
  return session;
}

/** Date et heure au format togolais : 15/10/2026 09:30. */
export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
