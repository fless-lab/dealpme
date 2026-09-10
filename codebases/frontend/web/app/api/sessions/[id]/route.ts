import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { api, ApiError, SESSION_COOKIE, messageFor } from "../../../../lib/api";

/** Révocation d'un appareil connecté (le serveur ne révoque que les sessions du titulaire). */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ ok: false, message: "Connexion requise" }, { status: 401 });
  try {
    await api(`/auth/sessions/${id}`, { method: "DELETE", token });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, message: messageFor(e) }, { status: e instanceof ApiError ? e.status : 502 });
  }
}
