export interface AuthResult {
  ok: boolean;
  mfaRequired?: boolean;
  challengeId?: string;
  emailChallengeId?: string;
  message?: string;
  details?: { reason?: string; challengeId?: string };
}

/** Réponse non confirmée : garder les saisies et permettre une nouvelle action explicite. */
export async function authRequest(action: "register" | "login" | "mfa" | "email-verify", body: unknown): Promise<AuthResult> {
  try {
    const response = await fetch(`/api/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!data || typeof data.ok !== "boolean" || (!response.ok && data.ok)) throw new Error("Réponse invalide");
    return data as AuthResult;
  } catch {
    throw new Error("Réponse non confirmée. Vérifiez votre connexion puis réessayez.");
  }
}
