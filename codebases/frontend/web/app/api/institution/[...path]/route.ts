import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { API_BASE, api, ApiError, SESSION_COOKIE, messageFor } from "../../../../lib/api";

/**
 * BFF de la console CCI-Togo. Le navigateur ne porte jamais de jeton : le cookie httpOnly est échangé ici
 * contre un appel authentifié. La liste blanche empêche ce relais de servir de proxy générique vers l'API ;
 * l'autorisation reste évaluée par l'API, qui refuse tout appelant sans le rôle d'officier.
 */
const POST_ALLOWED: RegExp[] = [
  /^membership-confirmations$/,
  /^registry-verifications$/,
  /^certifications$/,
  /^certification-requests\/[0-9a-f-]{36}\/remediation$/,
];
const isAllowed = (target: string) => POST_ALLOWED.some((r) => r.test(target));

async function token(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const target = path.join("/");
  if (!isAllowed(target)) return NextResponse.json({ ok: false, message: "Action inconnue" }, { status: 404 });
  const t = await token();
  if (!t) return NextResponse.json({ ok: false, message: "Connexion requise" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const result = await api<Record<string, unknown>>(`/institution/${target}`, { method: "POST", token: t, body: JSON.stringify(body) });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 502;
    const code = e instanceof ApiError ? e.envelope.code : "INTERNAL";
    return NextResponse.json({ ok: false, code, message: messageFor(e), details: e instanceof ApiError ? e.envelope.details : undefined }, { status });
  }
}

/** Export CSV du journal des certifications : le fichier transite par le BFF, l'URL de l'API n'est jamais exposée. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (path.join("/") !== "certifications.csv") return NextResponse.json({ ok: false, message: "Ressource inconnue" }, { status: 404 });
  const t = await token();
  if (!t) return NextResponse.json({ ok: false, message: "Connexion requise" }, { status: 401 });
  const upstream = await fetch(`${API_BASE}/institution/certifications.csv`, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
  if (!upstream.ok) return NextResponse.json({ ok: false, message: "Export indisponible" }, { status: upstream.status });
  return new NextResponse(await upstream.text(), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="certifications-deal-ready.csv"' },
  });
}
