import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { api, ApiError, SESSION_COOKIE } from "../../../../../lib/api";

/** Journal du scénario de démonstration : événements du dossier et journal d'audit, lus au nom du présentateur. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await ctx.params;
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!t) return NextResponse.json({ events: [], audit: [] }, { status: 401 });
  try {
    return NextResponse.json(await api<{ events: unknown[]; audit: unknown[] }>(`/demonstration/rps/${dealId}/journal`, { token: t }));
  } catch (e) {
    return NextResponse.json({ events: [], audit: [] }, { status: e instanceof ApiError ? e.status : 502 });
  }
}
