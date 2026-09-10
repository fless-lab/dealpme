"use client";

import type { ReactNode } from "react";

export interface NavItem {
  href: string;
  label: string;
  controlId: string;
  current?: boolean;
}

/**
 * AppShell : barre supérieure Marine (marque, navigation principale, compte), barre de contexte, contenu.
 * Le gabarit possède la navigation ; les pages composent les primitives et ne dupliquent jamais
 * la logique de permission, de preuve ou de cycle de vie.
 */
export function AppShell({
  brand = "DealPME",
  nav,
  account,
  strip,
  context,
  children,
  menuOpen = false,
  onToggleMenu,
}: {
  brand?: string;
  nav: NavItem[];
  account?: ReactNode;
  strip?: ReactNode;
  context?: ReactNode;
  children: ReactNode;
  menuOpen?: boolean;
  onToggleMenu?: () => void;
}) {
  return (
    <div className="dp-shell">
      <div>
        {strip}
        <header className="dp-topbar">
          <a className="dp-brand" href="/" data-control-id="NAV_HOME">
            Deal<span>PME</span>
          </a>
          <button type="button" className="dp-btn dp-btn-ghost dp-menu-button" data-control-id="NAV_MENU_TOGGLE" aria-expanded={menuOpen} onClick={onToggleMenu}>
            Menu
          </button>
          <nav aria-label="Navigation principale" className={menuOpen ? "dp-open" : undefined}>
            {nav.map((n) => (
              <a key={n.href} href={n.href} data-control-id={n.controlId} aria-current={n.current ? "page" : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="dp-topbar-end">{account}</div>
        </header>
      </div>
      {context ?? <div />}
      <main className="dp-main">{children}</main>
    </div>
  );
}

/** ContextBar : fil d'Ariane, état du dossier, palier de divulgation ; toujours visible au-dessus de la première tâche. */
export function ContextBar({ crumbs, children }: { crumbs: { label: string; href?: string }[]; children?: ReactNode }) {
  return (
    <div className="dp-contextbar">
      <div className="dp-crumbs">
        {crumbs.map((c, i) => (
          <span key={c.label}>
            {i > 0 ? " / " : ""}
            {c.href && i < crumbs.length - 1 ? <a href={c.href}>{c.label}</a> : <b>{c.label}</b>}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}

/** Espace de travail avec navigation latérale (tiroir sous 1024 px). TransactionNav et ServiceNav en sont deux usages. */
export function Workspace({ nav, ariaLabel, children }: { nav: NavItem[]; ariaLabel: string; children: ReactNode }) {
  return (
    <div className="dp-workspace">
      <nav className="dp-sidenav" aria-label={ariaLabel}>
        {nav.map((n) => (
          <a key={n.href} href={n.href} data-control-id={n.controlId} aria-current={n.current ? "page" : undefined}>
            {n.label}
          </a>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}

export function TransactionNav({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  return (
    <Workspace nav={nav} ariaLabel="Navigation de la transaction">
      {children}
    </Workspace>
  );
}

export function ServiceNav({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  return (
    <Workspace nav={nav} ariaLabel="Navigation du service">
      {children}
    </Workspace>
  );
}
