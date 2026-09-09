import type { ErrorEnvelope } from "@dealpme/contracts";

/**
 * Client API minimal. Le jeton de session est transmis en Authorization: Bearer ; le serveur décide de tout.
 * Toute erreur suit l'enveloppe { error: { code, message, details, correlationId } }.
 */
const BASE = process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:4000/v1";

export class ApiError extends Error {
  constructor(public readonly envelope: ErrorEnvelope["error"], public readonly status: number) {
    super(envelope.message);
  }
}

export async function api<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept-Language", "fr");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  const res = await fetch(`${BASE}${path}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorEnvelope | null;
    throw new ApiError(body?.error ?? { code: "INTERNAL", message: "Erreur réseau", correlationId: res.headers.get("x-correlation-id") ?? "" }, res.status);
  }
  return (await res.json()) as T;
}
