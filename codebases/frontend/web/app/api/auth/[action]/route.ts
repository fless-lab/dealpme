import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { api, ApiError, SESSION_COOKIE, messageFor } from "../../../../lib/api";
import { COOKIE_OPTIONS } from "../../../../lib/session";

/**
 * BFF d'authentification : le navigateur parle à ces routes, jamais directement à l'API avec un jeton.
 * Les jetons de session sont posés dans un cookie httpOnly. Les codes d'erreur de l'API sont conservés.
 */
type Action = "login" | "mfa" | "register" | "email-verify" | "logout";

async function setSession(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, COOKIE_OPTIONS);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const forward = { "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "", "user-agent": req.headers.get("user-agent") ?? "" };
  try {
    switch (action as Action) {
      case "login": {
        const r = await api<{ token?: string; expiresAt?: string; mfaRequired?: boolean; challengeId?: string; devCode?: string }>("/auth/login", { method: "POST", body: JSON.stringify(body), headers: forward });
        if (r.token) {
          await setSession(r.token);
          return NextResponse.json({ ok: true });
        }
        return NextResponse.json({ ok: false, mfaRequired: true, challengeId: r.challengeId, devCode: r.devCode });
      }
      case "mfa": {
        const r = await api<{ token: string }>("/auth/mfa/verify", { method: "POST", body: JSON.stringify(body), headers: forward });
        await setSession(r.token);
        return NextResponse.json({ ok: true });
      }
      case "register": {
        const r = await api<{ userId: string; emailChallengeId: string; devCode?: string }>("/auth/register", { method: "POST", body: JSON.stringify(body), headers: forward });
        return NextResponse.json({ ok: true, emailChallengeId: r.emailChallengeId, devCode: r.devCode });
      }
      case "email-verify": {
        await api("/auth/email/verify", { method: "POST", body: JSON.stringify(body) });
        return NextResponse.json({ ok: true });
      }
      case "logout": {
        const token = (await cookies()).get(SESSION_COOKIE)?.value;
        if (token) await api("/auth/sessions/logout", { method: "POST", token }).catch(() => undefined);
        (await cookies()).delete(SESSION_COOKIE);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ ok: false, message: "Action inconnue" }, { status: 404 });
    }
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 502;
    const code = e instanceof ApiError ? e.envelope.code : "INTERNAL";
    const details = e instanceof ApiError ? e.envelope.details : undefined;
    return NextResponse.json({ ok: false, code, message: messageFor(e), details }, { status });
  }
}
