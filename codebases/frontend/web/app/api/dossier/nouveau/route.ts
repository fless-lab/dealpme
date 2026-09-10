import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { api, ApiError, SESSION_COOKIE, messageFor } from "../../../../lib/api";

/**
 * Création d'un dossier : l'entreprise puis le dossier, en une action côté écran.
 * Le type de cession part avec la création et devient immuable (un déclencheur en base l'impose).
 */
export async function POST(req: NextRequest) {
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!t) return NextResponse.json({ ok: false, message: "Connexion requise" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  try {
    const company = await api<{ companyId: string }>("/companies", {
      method: "POST",
      token: t,
      body: JSON.stringify({ legalName: body["legalName"], legalForm: body["legalForm"], ...(body["rccmNumber"] ? { rccmNumber: body["rccmNumber"] } : {}) }),
    });
    const deal = await api<{ dealId: string }>("/deals", {
      method: "POST",
      token: t,
      body: JSON.stringify({ companyId: company.companyId, dealType: body["dealType"], sectorCode: body["sectorCode"], regionCode: body["regionCode"], turnoverBand: body["turnoverBand"] }),
    });
    return NextResponse.json({ ok: true, dealId: deal.dealId });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 502;
    return NextResponse.json({ ok: false, code: e instanceof ApiError ? e.envelope.code : "INTERNAL", message: messageFor(e) }, { status });
  }
}
