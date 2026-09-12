import { NextResponse, type NextRequest } from "next/server";
import { api, ApiError, messageFor } from "../../../lib/api";

async function start(req: NextRequest, binding: "redirect" | "post") {
  let params: URLSearchParams;
  if (binding === "redirect") params = req.nextUrl.searchParams;
  else {
    if (!req.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return NextResponse.json({ message: "Binding SAML POST attendu" }, { status: 400 });
    const reader = req.body?.getReader(); if (!reader) return NextResponse.json({ message: "Requête absente" }, { status: 400 });
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.length; if (length > 131072) { await reader.cancel(); return NextResponse.json({ message: "Requête trop volumineuse" }, { status: 413 }); } chunks.push(chunk.value); }
    params = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  }
  if (params.getAll("SAMLRequest").length !== 1 || params.getAll("RelayState").length > 1) return NextResponse.json({ message: "Requête SAML ambiguë" }, { status: 400 });
  try {
    const result = await api<{ challengeId: string }>("/federation/remo/challenges", { method: "POST", body: JSON.stringify({ samlRequest: params.get("SAMLRequest"), relayState: params.get("RelayState") ?? "", binding }) });
    // Location relative : Next peut normaliser req.url sur l'hôte interne du proxy.
    const response = new NextResponse(null, { status: 303, headers: { Location: "/sso/remo/complete" } });
    response.cookies.set("dp_saml_challenge", result.challengeId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/sso/remo", maxAge: 300 });
    response.headers.set("Cache-Control", "no-store"); response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) { return NextResponse.json({ message: messageFor(error) }, { status: error instanceof ApiError ? error.status : 502, headers: { "Cache-Control": "no-store" } }); }
}
export const GET = (req: NextRequest) => start(req, "redirect");
export const POST = (req: NextRequest) => start(req, "post");
