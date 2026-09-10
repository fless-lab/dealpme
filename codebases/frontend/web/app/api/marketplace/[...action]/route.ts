import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { api, ApiError, SESSION_COOKIE, messageFor } from "../../../../lib/api";

/**
 * BFF de la place de marché : manifestation d'intérêt, message, alertes, publication d'un dossier.
 * Liste blanche de chemins ; l'autorisation reste évaluée par l'API.
 */
const UUID = "[0-9a-f-]{36}";
const POST_ROUTES: { pattern: RegExp; path: (m: RegExpMatchArray) => string }[] = [
  { pattern: new RegExp(`^deals/(${UUID})/interests$`), path: (m) => `/deals/${m[1]}/interests` },
  { pattern: new RegExp(`^deals/(${UUID})/messages$`), path: (m) => `/deals/${m[1]}/messages` },
  { pattern: new RegExp(`^deals/(${UUID})/publish$`), path: (m) => `/deals/${m[1]}/transitions` },
  { pattern: /^alerts$/, path: () => "/alerts" },
  { pattern: new RegExp(`^alerts/(${UUID})/opt-in$`), path: (m) => `/alerts/${m[1]}/opt-in` },
  { pattern: new RegExp(`^valuations/(${UUID})$`), path: () => "/valuations/indicative" },
];

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string[] }> }) {
  const { action } = await ctx.params;
  const target = action.join("/");
  const route = POST_ROUTES.map((r) => ({ r, m: target.match(r.pattern) })).find((x) => x.m);
  if (!route?.m) return NextResponse.json({ ok: false, message: "Action inconnue" }, { status: 404 });
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!t) return NextResponse.json({ ok: false, message: "Connexion requise" }, { status: 401 });
  const payload = target.endsWith("/publish") ? { to: "LISTED_OPEN" } : await req.json().catch(() => ({}));
  try {
    const result = await api<Record<string, unknown>>(route.r.path(route.m), { method: "POST", token: t, body: JSON.stringify(payload) });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 502;
    return NextResponse.json(
      { ok: false, code: e instanceof ApiError ? e.envelope.code : "INTERNAL", message: messageFor(e), details: e instanceof ApiError ? e.envelope.details : undefined },
      { status },
    );
  }
}

/** Fil des messages d'un dossier, pour la partie qui le consulte. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ action: string[] }> }) {
  const { action } = await ctx.params;
  const match = action.join("/").match(new RegExp(`^threads/(${UUID})$`));
  if (!match) return NextResponse.json({ ok: false, message: "Ressource inconnue" }, { status: 404 });
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!t) return NextResponse.json({ items: [] });
  try {
    const result = await api<{ items: unknown[] }>(`/deals/${match[1]}/messages`, { token: t });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ items: [] });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ action: string[] }> }) {
  const { action } = await ctx.params;
  const target = action.join("/");
  if (!new RegExp(`^alerts/${UUID}$`).test(target)) return NextResponse.json({ ok: false, message: "Ressource inconnue" }, { status: 404 });
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!t) return NextResponse.json({ ok: false, message: "Connexion requise" }, { status: 401 });
  try {
    await api(`/${target}`, { method: "DELETE", token: t });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, message: messageFor(e) }, { status: e instanceof ApiError ? e.status : 502 });
  }
}
