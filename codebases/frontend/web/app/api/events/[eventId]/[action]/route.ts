import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { api, ApiError, SESSION_COOKIE, messageFor } from "../../../../../lib/api";
import { IdSchema } from "@dealpme/contracts";

/**
 * BFF Deal-Connect : inscription, consentement d'échange de contacts, et redirection vers la salle.
 * L'accès est demandé au moment du clic : admission temporaire locale ou connexion Remo après
 * rapprochement de l'invitation. Une URL Remo n'est pas présentée comme un jeton SSO individuel.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ eventId: string; action: string }> }) {
  const { eventId, action } = await ctx.params;
  if(!IdSchema.safeParse(eventId).success)return NextResponse.json({ok:false,message:"Identifiant d'événement invalide"},{status:400});
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!t) return NextResponse.json({ ok: false, message: "Connexion requise" }, { status: 401 });
  const path = action === "register" ? `/events/${eventId}/registrations` : action === "contact-consent" ? `/events/${eventId}/contact-consent` : null;
  if (!path) return NextResponse.json({ ok: false, message: "Action inconnue" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  try {
    const result = await api<Record<string, unknown>>(path, { method: "POST", token: t, body: JSON.stringify(body) });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, code: e instanceof ApiError ? e.envelope.code : "INTERNAL", message: messageFor(e) },
      { status: e instanceof ApiError ? e.status : 502 },
    );
  }
}

/** Redirection vers la salle du partenaire : le lien est demandé à l'API puis suivi immédiatement. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ eventId: string; action: string }> }) {
  const { eventId, action } = await ctx.params;
  if(!IdSchema.safeParse(eventId).success)return NextResponse.json({ok:false,message:"Identifiant d'événement invalide"},{status:400});
  if (action !== "join") return NextResponse.json({ ok: false, message: "Ressource inconnue" }, { status: 404 });
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!t) return NextResponse.redirect(new URL("/connexion", _req.url));
  try {
    const { joinUrl } = await api<{ joinUrl: string }>(`/events/${eventId}/join-url`, { token: t });
    return NextResponse.redirect(joinUrl);
  } catch (e) {
    return NextResponse.json({ ok: false, message: messageFor(e) }, { status: e instanceof ApiError ? e.status : 502 });
  }
}
