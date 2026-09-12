import { cookies } from "next/headers";
import { api, ApiError, SESSION_COOKIE } from "./api";

export interface Me {
  userId: string;
  organisationId: string;
  email: string;
  phoneE164: string | null;
  emailVerifiedAt: string | null;
  roles: string[];
  organisation: string;
}

/** Session côté serveur : lit le cookie httpOnly et interroge /me. Renvoie null si absent ou invalide (jamais d'exception vers la page). */
export async function getSession(): Promise<{ token: string; me: Me } | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const me = await api<Me>("/me", { token });
    return { token, me };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
    return null;
  }
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 30 * 60,
};

/** Libellés français des rôles pour l'en-tête et la navigation. */
export const ROLE_LABEL: Record<string, string> = {
  SELLER: "Cédant",
  INVESTOR: "Investisseur",
  INVESTOR_DIASPORA: "Investisseur diaspora",
  ADVISOR: "Conseil",
  BANK: "Banque",
  CCI_OFFICER: "Officier CCI-Togo",
  EXPERT: "Expert",
  COMPLIANCE_OPERATOR: "Conformité",
  PLATFORM_ADMIN: "Administration",
};

export function navFor(roles: string[]): { href: string; label: string; controlId: string }[] {
  const nav = [{ href: "/opportunites", label: "Opportunités", controlId: "NAV_OPPORTUNITIES" }];
  if (roles.includes("SELLER") || roles.includes("ADVISOR")) nav.push({ href: "/cedant", label: "Espace cédant", controlId: "NAV_SELLER" });
  if (roles.includes("INVESTOR") || roles.includes("INVESTOR_DIASPORA") || roles.includes("BANK")) nav.push({ href: "/investisseur", label: "Espace investisseur", controlId: "NAV_INVESTOR" });
  if (roles.includes("CCI_OFFICER")) nav.push({ href: "/cci", label: "Console CCI-Togo", controlId: "NAV_CCI" });
  if (roles.includes("COMPLIANCE_OPERATOR")) nav.push({ href: "/conformite", label: "Conformité", controlId: "NAV_COMPLIANCE" });
  if (roles.includes("PLATFORM_ADMIN")) nav.push({ href: "/admin", label: "Administration", controlId: "NAV_ADMIN" });
  nav.push({ href: "/evenements", label: "Deal-Connect", controlId: "NAV_EVENTS" });
  if(roles.some(r=>["CCI_OFFICER","PLATFORM_ADMIN"].includes(r))) nav.push({href:"/organisateur/evenements",label:"Organisation événements",controlId:"NAV_ORGANISER"});
  if(roles.some(r=>["INVESTOR","INVESTOR_DIASPORA"].includes(r))) nav.push({href:"/diaspora",label:"Guichet Diaspora",controlId:"NAV_DIASPORA"});
  // Surface de démonstration du blocage réglementaire : visible des comptes qui présentent le produit.
  if (roles.some((r) => ["SELLER", "ADVISOR", "CCI_OFFICER", "COMPLIANCE_OPERATOR", "PLATFORM_ADMIN"].includes(r))) {
    nav.push({ href: "/demonstration", label: "Démonstration RPS", controlId: "NAV_DEMONSTRATION" });
  }
  return nav;
}
