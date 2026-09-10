import type { ErrorEnvelope } from "@dealpme/contracts";

/**
 * Client API côté serveur Next (route handlers et composants serveur). Le jeton de session est lu dans le
 * cookie httpOnly et transmis en Authorization : il n'atteint jamais le JavaScript du navigateur.
 * Toute erreur suit l'enveloppe { error: { code, message, details, correlationId } } ; les codes restent distincts.
 */
export const API_BASE = process.env["API_BASE_URL"] ?? process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:4000/v1";
export const SESSION_COOKIE = "dp_session";

export class ApiError extends Error {
  constructor(
    public readonly envelope: ErrorEnvelope["error"],
    public readonly status: number,
  ) {
    super(envelope.message);
  }
}

export async function api<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept-Language", "fr");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorEnvelope | null;
    throw new ApiError(body?.error ?? { code: "INTERNAL", message: "Service indisponible", correlationId: res.headers.get("x-correlation-id") ?? "" }, res.status);
  }
  return (await res.json()) as T;
}

/** Message français par code d'erreur : l'erreur nomme l'action et le chemin de récupération. */
export function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.envelope.code) {
      case "UNAUTHENTICATED":
        return "Identifiants ou code invalides. Vérifiez votre saisie et réessayez.";
      case "RATE_LIMITED":
        return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
      case "FORBIDDEN":
        return (err.envelope.details as { reason?: string } | undefined)?.reason === "EMAIL_NOT_VERIFIED" ? "Votre adresse email n'est pas encore vérifiée. Saisissez le code reçu par email." : "Action non autorisée pour votre compte.";
      case "PERIMETER_BLOCKED":
        // Le serveur explique le motif réglementaire en toutes lettres : c'est ce message qu'il faut lire.
        return err.envelope.message || "Publication bloquée par le périmètre réglementaire.";
      case "CONFLICT":
        return "Un compte existe déjà avec cet email. Connectez-vous ou utilisez une autre adresse.";
      case "VALIDATION_FAILED":
      default:
        // Les services renvoient des messages précis, qui disent quoi corriger : ils priment.
        // Le repli générique ne sert qu'aux erreurs de schéma, dont le message serveur est technique.
        return err.envelope.message && err.envelope.message.length > 30 ? err.envelope.message : "Certains champs sont invalides. Corrigez les champs signalés.";
    }
  }
  return "Service momentanément indisponible. Réessayez dans un instant.";
}
