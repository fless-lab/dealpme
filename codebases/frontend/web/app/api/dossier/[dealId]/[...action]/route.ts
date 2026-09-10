import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { API_BASE, api, ApiError, SESSION_COOKIE, messageFor } from "../../../../../lib/api";

/**
 * BFF du dossier cédant. Liste blanche d'actions : ce relais n'est pas un proxy générique.
 * Le dépôt de pièce est retransmis tel quel (multipart) sans être écrit sur disque côté web ;
 * l'analyse antivirus et le stockage chiffré restent la responsabilité de l'API.
 */
const POST_ALLOWED = new Set(["facts", "documents", "submit"]);

async function token(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

function fail(e: unknown) {
  const status = e instanceof ApiError ? e.status : 502;
  const code = e instanceof ApiError ? e.envelope.code : "INTERNAL";
  const details = e instanceof ApiError ? e.envelope.details : undefined;
  return NextResponse.json({ ok: false, code, message: messageFor(e), details }, { status });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ dealId: string; action: string[] }> }) {
  const { dealId, action } = await ctx.params;
  const target = action.join("/");
  if (!POST_ALLOWED.has(target)) return NextResponse.json({ ok: false, message: "Action inconnue" }, { status: 404 });
  const t = await token();
  if (!t) return NextResponse.json({ ok: false, message: "Connexion requise" }, { status: 401 });

  try {
    if (target === "documents") {
      // Le corps multipart est relayé en flux : la pièce ne touche jamais le disque du serveur web.
      const upstream = await fetch(`${API_BASE}/deals/${dealId}/dossier/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": req.headers.get("content-type") ?? "multipart/form-data" },
        body: await req.arrayBuffer(),
        cache: "no-store",
      });
      const body = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        const envelope = (body as { error?: { code: string; message: string; details?: unknown } } | null)?.error;
        return NextResponse.json(
          { ok: false, code: envelope?.code ?? "INTERNAL", message: envelope?.message ?? "Dépôt impossible", details: envelope?.details },
          { status: upstream.status },
        );
      }
      return NextResponse.json({ ok: true, ...(body as Record<string, unknown>) });
    }

    const payload = await req.json().catch(() => ({}));
    if (target === "submit") {
      const result = await api<Record<string, unknown>>(`/deals/${dealId}/transitions`, { method: "POST", token: t, body: JSON.stringify({ to: "PENDING_VERIFICATION" }) });
      return NextResponse.json({ ok: true, ...result });
    }
    const result = await api<Record<string, unknown>>(`/deals/${dealId}/dossier/facts`, { method: "POST", token: t, body: JSON.stringify(payload) });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return fail(e);
  }
}

/** Contenu d'une pièce : il transite par le BFF, l'URL de l'API et celle du stockage restent invisibles. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ dealId: string; action: string[] }> }) {
  const { dealId, action } = await ctx.params;
  const t = await token();
  if (!t) return NextResponse.json({ ok: false, message: "Connexion requise" }, { status: 401 });
  const [kind, documentId, sub] = action;
  if (kind !== "documents" || !documentId || sub !== "content") return NextResponse.json({ ok: false, message: "Ressource inconnue" }, { status: 404 });
  const upstream = await fetch(`${API_BASE}/deals/${dealId}/dossier/documents/${documentId}/content`, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
  if (!upstream.ok) return NextResponse.json({ ok: false, message: "Pièce introuvable" }, { status: upstream.status });
  return new NextResponse(await upstream.arrayBuffer(), {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? "inline",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
