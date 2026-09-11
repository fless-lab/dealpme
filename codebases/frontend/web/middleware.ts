import { NextResponse, type NextRequest } from "next/server";

/**
 * Le chemin courant n'est pas accessible aux composants serveur : Next ne le transmet pas.
 * Le middleware le pose en en-tête interne, ce qui permet au gabarit de marquer l'élément de navigation
 * actif sans rendre la coquille entière côté client. L'en-tête ne sort jamais vers le navigateur.
 */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-chemin", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
