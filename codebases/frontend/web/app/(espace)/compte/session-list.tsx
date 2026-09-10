"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, StateBanner } from "@dealpme/ui";

interface SessionRow {
  id: string;
  deviceLabel: string | null;
  lastSeenAt: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function SessionList({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  if (sessions.length === 0) {
    return <StateBanner tone="info" title="Aucun appareil connecté" controlId="ACCOUNT_SESSIONS_EMPTY" />;
  }
  async function revoke(id: string) {
    setBusy(id);
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }
  return (
    <div className="dp-tablewrap">
      <table className="dp-table">
        <thead>
          <tr>
            <th>Appareil</th>
            <th>Dernière activité</th>
            <th>Ouverte le</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} data-control-id="ACCOUNT_SESSION_ROW">
              <td>
                {s.deviceLabel ?? "Appareil inconnu"} {s.current ? <span className="dp-badge" data-tone="info">Cet appareil</span> : null}
              </td>
              <td>{fmt(s.lastSeenAt)}</td>
              <td>{fmt(s.createdAt)}</td>
              <td>
                {s.current ? null : (
                  <Button controlId="ACCOUNT_SESSION_REVOKE" variant="secondary" state={busy === s.id ? "loading" : "default"} onClick={() => revoke(s.id)}>
                    Révoquer
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
