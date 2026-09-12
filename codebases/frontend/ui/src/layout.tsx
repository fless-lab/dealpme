"use client";

import type { ReactNode } from "react";

export interface NavItem {
  href: string;
  label: string;
  controlId: string;
  current?: boolean;
}

/**
 * Élément courant d'une navigation. Le chemin exact l'emporte ; à défaut, le préfixe le plus long gagne,
 * pour qu'une sous-page marque sa rubrique sans que la racine "/" marque tout.
 */
export function markCurrent(items: NavItem[], pathname: string | null | undefined): NavItem[] {
  if (!pathname) return items;
  const candidats = items
    .map((item, index) => ({ index, href: item.href.split("?")[0] ?? item.href }))
    .filter((c) => pathname === c.href || (c.href !== "/" && pathname.startsWith(`${c.href}/`)));
  if (candidats.length === 0) return items;
  const gagnant = candidats.reduce((a, b) => (b.href.length > a.href.length ? b : a));
  return items.map((item, index) => (index === gagnant.index ? { ...item, current: true } : item));
}

/**
 * AppShell : barre supérieure Marine (marque, navigation principale, compte), barre de contexte, contenu.
 * Le gabarit possède la navigation ; les pages composent les primitives et ne dupliquent jamais
 * la logique de permission, de preuve ou de cycle de vie.
 */
export function AppShell({
  pathname,
  nav,
  account,
  strip,
  context,
  children,
  menuOpen = false,
  onToggleMenu,
}: {
  brand?: string;
  /** Chemin courant, transmis par l'application : il sert à marquer l'élément de navigation actif. */
  pathname?: string;
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
      <a className="dp-skip" href="#contenu" data-control-id="NAV_SKIP">
        Aller au contenu
      </a>
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
            {markCurrent(nav, pathname).map((n) => (
              <a key={n.href} href={n.href} data-control-id={n.controlId} aria-current={n.current ? "page" : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="dp-topbar-end">{account}</div>
        </header>
      </div>
      {context ?? <div />}
      <main className="dp-main" id="contenu" tabIndex={-1}>{children}</main>
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
export function Workspace({ nav, ariaLabel, pathname, children }: { nav: NavItem[]; ariaLabel: string; pathname?: string; children: ReactNode }) {
  return (
    <div className="dp-workspace">
      <nav className="dp-sidenav" aria-label={ariaLabel}>
        {markCurrent(nav, pathname).map((n) => (
          <a key={n.href} href={n.href} data-control-id={n.controlId} aria-current={n.current ? "page" : undefined}>
            {n.label}
          </a>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}

export function TransactionNav({ nav, pathname, children }: { nav: NavItem[]; pathname?: string; children: ReactNode }) {
  return (
    <Workspace nav={nav} ariaLabel="Navigation de la transaction" {...(pathname ? { pathname } : {})}>
      {children}
    </Workspace>
  );
}

export function ServiceNav({ nav, pathname, children }: { nav: NavItem[]; pathname?: string; children: ReactNode }) {
  return (
    <Workspace nav={nav} ariaLabel="Navigation du service" {...(pathname ? { pathname } : {})}>
      {children}
    </Workspace>
  );
}
