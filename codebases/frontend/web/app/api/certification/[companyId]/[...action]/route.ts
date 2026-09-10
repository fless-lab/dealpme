import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { api, ApiError, SESSION_COOKIE, messageFor } from "../../../../../lib/api";

/** BFF de la certification côté entreprise : dépôt et retrait d'une demande. Liste blanche d'actions. */
const ALLOWED: RegExp[] = [/^request$/, /^[0-9a-f-]{36}\/withdraw$/];

export async function POST(req: NextRequest, ctx: { params: Promise<{ companyId: string; action: string[] }> }) {
  const { companyId, action } = await ctx.params;
  const target = action.join("/");
  if (!ALLOWED.some((r) => r.test(target))) return NextResponse.json({ ok: false, message: "Action inconnue" }, { status: 404 });
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!t) return NextResponse.json({ ok: false, message: "Connexion requise" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const path = target === "request" ? `/companies/${companyId}/certification-requests` : `/companies/${companyId}/certification-requests/${action[0]}/withdraw`;
  try {
    const result = await api<Record<string, unknown>>(path, { method: "POST", token: t, body: JSON.stringify(body) });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 502;
    return NextResponse.json(
      { ok: false, code: e instanceof ApiError ? e.envelope.code : "INTERNAL", message: messageFor(e), details: e instanceof ApiError ? e.envelope.details : undefined },
      { status },
    );
  }
}
