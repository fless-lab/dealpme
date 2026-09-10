"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Menu du compte : identité, rôle, accès à la page Compte, déconnexion (révoque la session côté serveur). */
export function AccountMenu({ email, role }: { email: string; role: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/connexion");
    router.refresh();
  }
  return (
    <>
      <a href="/compte" data-control-id="NAV_ACCOUNT" style={{ color: "#fff", textDecoration: "none" }}>
        <b>{email}</b>
        <span style={{ display: "block", fontSize: "0.75rem", color: "#b9c9e3" }}>{role}</span>
      </a>
      <button type="button" className="dp-btn dp-btn-ghost" style={{ color: "#d6e2f5" }} data-control-id="NAV_LOGOUT" onClick={logout} disabled={busy}>
        Se déconnecter
      </button>
    </>
  );
}
