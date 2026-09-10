import { redirect } from "next/navigation";
import { Panel, StateBanner } from "@dealpme/ui";
import { api } from "../../../lib/api";
import { getSession, ROLE_LABEL } from "../../../lib/session";
import { SessionList } from "./session-list";

interface SessionRow {
  id: string;
  deviceLabel: string | null;
  lastSeenAt: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

/** Page Compte : identité, rôle, consentements, appareils connectés avec révocation à distance (DP-IDN). */
export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  let sessions: SessionRow[] = [];
  let error: string | null = null;
  try {
    sessions = (await api<{ items: SessionRow[] }>("/auth/sessions", { token: session.token })).items;
  } catch {
    error = "La liste des appareils est momentanément indisponible.";
  }
  const me = session.me;
  return (
    <div className="dp-stack" style={{ maxWidth: 820 }}>
      <h1>Mon compte</h1>
      <Panel title="Identité" controlId="ACCOUNT_IDENTITY">
        <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 24px", margin: 0 }}>
          <dt className="dp-label">Organisation</dt>
          <dd style={{ margin: 0 }}>{me.organisation}</dd>
          <dt className="dp-label">Email</dt>
          <dd style={{ margin: 0 }}>
            {me.email} {me.emailVerifiedAt ? <span className="dp-badge" data-tone="success">Vérifié</span> : <span className="dp-badge" data-tone="warning">Non vérifié</span>}
          </dd>
          <dt className="dp-label">Téléphone</dt>
          <dd style={{ margin: 0 }}>{me.phoneE164 ?? "Non renseigné"}</dd>
          <dt className="dp-label">Rôle</dt>
          <dd style={{ margin: 0 }}>{me.roles.map((r) => ROLE_LABEL[r] ?? r).join(", ")}</dd>
        </dl>
      </Panel>
      <Panel title="Appareils connectés" controlId="ACCOUNT_SESSIONS">
        <p className="dp-muted" style={{ marginTop: 0 }}>
          Chaque session expire après 30 minutes d'inactivité. Vous pouvez révoquer à distance un appareil que vous ne reconnaissez pas.
        </p>
        {error ? <StateBanner tone="warning" title="Indisponible" controlId="ACCOUNT_SESSIONS_ERROR">{error}</StateBanner> : <SessionList sessions={sessions} />}
      </Panel>
    </div>
  );
}
