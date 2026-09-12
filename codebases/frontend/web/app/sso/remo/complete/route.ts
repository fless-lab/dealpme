import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { api, ApiError, messageFor, SESSION_COOKIE } from "../../../../lib/api";

const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export async function GET(_req: NextRequest) {
  const store = await cookies(), token = store.get(SESSION_COOKIE)?.value, challenge = store.get("dp_saml_challenge")?.value;
  if (!challenge || !/^[a-f0-9]{64}$/.test(challenge)) return NextResponse.json({ message: "Recommencez la connexion depuis Remo : demande SSO absente ou expirée." }, { status: 400 });
  if (!token) return new NextResponse(null, { status: 303, headers: { Location: "/connexion?next=/sso/remo/complete", "Cache-Control": "no-store" } });
  try {
    const result = await api<{ samlResponse: string; acsUrl: string; relayState: string }>(`/federation/remo/challenges/${challenge}/complete`, { method: "POST", token, body: "{}" });
    const acs = new URL(result.acsUrl);
    if (acs.protocol !== "https:" || acs.username || acs.password || acs.search || acs.hash || !/^[A-Za-z0-9+/]+=*$/.test(result.samlResponse)) throw new Error("Réponse SSO invalide");
    const nonce = randomBytes(16).toString("base64");
    const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Connexion à Remo</title><body><p>Connexion avec votre identité DealPME vérifiée.</p><form method="post" action="${escape(acs.href)}"><input type="hidden" name="SAMLResponse" value="${result.samlResponse}"><input type="hidden" name="RelayState" value="${escape(result.relayState)}"><button type="submit" data-control-id="SAML_POST_CONTINUE">Continuer vers Remo</button></form><script nonce="${nonce}">document.forms[0].submit()</script></body></html>`;
    const response = new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": `default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action ${acs.origin}; script-src 'nonce-${nonce}'` } });
    response.cookies.set("dp_saml_challenge", "", { path: "/sso/remo", maxAge: 0, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
    return response;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return new NextResponse(null, { status: 303, headers: { Location: "/connexion?next=/sso/remo/complete", "Cache-Control": "no-store" } });
    return new NextResponse(`<!doctype html><html lang="fr"><meta charset="utf-8"><h1>Connexion SSO non confirmée</h1><p>${escape(messageFor(error))}</p><a href="/connexion?next=/sso/remo/complete">Se reconnecter à DealPME</a><p>Si la demande a expiré, recommencez depuis Remo.</p></html>`, { status: error instanceof ApiError ? error.status : 502, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
  }
}
