/**
 * Jetons de la charte DealPME (Brand Guidelines Kit, éd. 1.1, mai 2026).
 * Bleu Signal : accent, au plus 5 % d'une surface. Couleurs fonctionnelles réservées aux statuts, jamais décoratives.
 */
export const colors = {
  marineEncre: "#1C2751",
  bleuSignal: "#6678F1",
  papier: "#F2F2F3",
  graphite: "#1D1F20",
  acier: "#5980A6",
  verifie: "#2F6B4F",
  enCours: "#B07A2B",
  retire: "#8C3A3A",
  blanc: "#FFFFFF",
} as const;

export const fonts = {
  display: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  body: '"Barlow", Arial, "Segoe UI", sans-serif',
  mono: 'ui-monospace, "SF Mono", Consolas, monospace',
} as const;

export const typeScale = {
  display: "2.4rem",
  h1: "1.8rem",
  h2: "1.4rem",
  h3: "1.15rem",
  body: "1rem",
  small: "0.875rem",
  label: "0.72rem",
} as const;

export const spacing = { xs: "0.25rem", sm: "0.5rem", md: "1rem", lg: "1.5rem", xl: "2.5rem" } as const;
export const radius = { sm: "4px", md: "8px", pill: "999px" } as const;

/** Statuts de documents et de dossiers : la seule utilisation autorisée des couleurs fonctionnelles. */
export const statusColor = { VERIFIED: colors.verifie, PENDING: colors.enCours, WITHDRAWN: colors.retire } as const;
