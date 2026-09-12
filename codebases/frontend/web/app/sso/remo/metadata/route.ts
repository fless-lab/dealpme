import { API_BASE } from "../../../../lib/api";
export async function GET() {
  try {
    const response = await fetch(`${API_BASE}/federation/remo/metadata`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) return new Response("Métadonnées SSO indisponibles", { status: response.status,headers:{"Cache-Control":"no-store"} });
    return new Response(await response.text(), { headers: { "Content-Type": "application/samlmetadata+xml; charset=utf-8", "Cache-Control": "no-store" } });
  } catch { return new Response("Métadonnées SSO indisponibles",{status:503,headers:{"Cache-Control":"no-store"}}); }
}
