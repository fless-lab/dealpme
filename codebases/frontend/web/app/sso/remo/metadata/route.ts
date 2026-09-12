import { API_BASE } from "../../../../lib/api";
export async function GET() {
  const response = await fetch(`${API_BASE}/federation/remo/metadata`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!response.ok) return new Response("SSO non activé", { status: response.status });
  return new Response(await response.text(), { headers: { "Content-Type": "application/samlmetadata+xml; charset=utf-8", "Cache-Control": "no-store" } });
}
