/**
 * Jetons du design system produit DealPME.
 * Source : Enterprise Design System v1.0 (tokens/dealpme.tokens.json) et Tranche 3 (react-mapping/tokens.ts).
 * Règles : espaces de travail blanc papier, navigation structurelle en Marine, Bleu Signal rare (focus, action),
 * vert / ambre / rouge sémantiques uniquement, typographie et espacement avant l'ombre.
 *
 * Note : la charte de marque (Marine Encre #1C2751, Bleu Signal #6678F1, Barlow) régit le site public et l'imprimé ;
 * le design system produit régit l'application. Décision A09 du classeur, à confirmer avec le designer.
 */
export const color = {
  navy: "#0B2B52",
  navy2: "#133A6A",
  signal: "#1769E8",
  paper: "#FFFFFF",
  canvas: "#F5F8FC",
  text: "#10233D",
  muted: "#5D6B7D",
  line: "#D8E1EC",
  success: "#20A464",
  warning: "#E89A19",
  risk: "#D9474D",
  infoSoft: "#EAF2FE",
  successSoft: "#E6F6EE",
  warningSoft: "#FCF1DF",
  riskSoft: "#FBE7E8",
} as const;

export const font = {
  ui: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  display: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  mono: 'ui-monospace, "SF Mono", Consolas, monospace',
} as const;

/** Échelle 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 / 64 / 80 ; rythme 8 px ; marge produit 24 px. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80 } as const;
export const radius = { sm: 4, md: 6, lg: 8, xl: 12 } as const;
export const layout = { productMargin: 24, rhythm: 8, touchTarget: 44 } as const;

/** Six patrons de mouvement seulement (guide MOTION_SYSTEM). */
export const motion = {
  controlFeedback: 140,
  panelEmphasis: 190,
  modalEnter: 190,
  toastReveal: 190,
  drawerNavigation: 190,
  stageProgression: 280,
  ease: "cubic-bezier(.2,.8,.2,1)",
} as const;

/** 1440 desktop d'autorité, 1280 portable compact, 1024 tablette (barre latérale en tiroir), 640 mobile, 420 mobile compact. */
export const breakpoint = { compactMobile: 420, mobile: 640, tablet: 1024, laptop: 1280, desktop: 1440 } as const;

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";
export type Tier = "T0" | "T1" | "T2";
