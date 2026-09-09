---
name: Sovereign M&A Virtual Data Room
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#44474d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777e'
  outline-variant: '#c5c6cd'
  surface-tint: '#515f78'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#0d1c32'
  on-primary-container: '#76849f'
  inverse-primary: '#b9c7e4'
  secondary: '#1d4ed8'
  on-secondary: '#ffffff'
  secondary-container: '#4069f2'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002114'
  on-tertiary-container: '#069669'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#b9c7e4'
  on-primary-fixed: '#0d1c32'
  on-primary-fixed-variant: '#39475f'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b7c4ff'
  on-secondary-fixed: '#001551'
  on-secondary-fixed-variant: '#0039b5'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
  data-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
  grid-gutter: 1rem
  sidebar-width: 18rem
  command-bar-height: 3.25rem
---

## Brand & Style

This design system establishes an institutional-grade, mission-critical workspace engineered for multi-billion-dollar mergers, acquisitions, restructuring, and private equity due diligence. The audience consists of tier-one investment bankers, general counsel, private equity deal leads, corporate development officers, and sovereign wealth analysts.

The aesthetic philosophy balances **Corporate Modernism** with **Surgical Precision**:
- **Authoritative & Discreet:** Avoids playful ornamentation, flashy gradients, or frivolous micro-interactions. Interface chrome recedes completely, directing cognitive focus entirely toward documents, compliance levels, and velocity metrics.
- **Surgical Legibility:** Dense layouts provide rapid scanning across tens of thousands of diligence artifacts, accompanied by strict visual guarantees of security, clearance status, and immutable audit trails.
- **Controlled Density:** High information density without visual clutter, realized through disciplined structural alignment, microscopic hairline borders, and unambiguous information hierarchy.

## Colors

The palette enforces strict structural and semantic boundaries. The foundational workspace utilizes a cool white and slate canvas, while security-critical surfaces rely on an authoritative deep navy.

### Palette Roles
- **Command & Security Canvas (`#0A192F`, `#0F233D`, `#1E293B`):** Reserved for global navigation headers, persistent audit bars, active credential scopes, and security policy modals.
- **Workspace Surfaces (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`, `#E2E8F0`):** Ultra-clean, cool-neutral hierarchy ensuring continuous high-contrast reading of financial exhibits, PDFs, and data grids.
- **Sovereign Action Blue (`#1D4ED8`, hover `#1E40AF`):** Designates confirmed systemic actions, document download triggers, active selection states, and primary navigational commitments.
- **Verification Emerald (`#059669`, background `#ECFDF5`):** Denotes verified audit logs, fully redacted/cleared exhibits, executed NDAs, and live data synchronization.
- **Diligence Amber (`#D97706`, background `#FFFBEB`):** Flags pending buyer Q&A, active redlines, conditional access grants, and audit exceptions.
- **Clean Team Crimson (`#DC2626`, background `#FEF2F2`):** Demarcates hyper-restricted Clean Team Only items, dynamic watermarking triggers, revoked access, and strict non-disclosure fences.

## Typography

The typographical foundation centers on **Inter** paired with **JetBrains Mono** for quantitative, audit, and cryptographic data.

### Numerical and Audit Rules
- All numeric tables, financial valuations, bid timelines, page counters, and file-size metrics must enable `font-variant-numeric: tabular-nums lining-nums`.
- Monospaced typography (`JetBrains Mono`) is strictly dedicated to cryptographic checksums (SHA-256 hashes), permission bitmasks, user IP addresses, time-stamped activity feeds, and document index identifiers (e.g., `DOC-0492-EXEC`).
- High-level deal metrics utilize medium-bold weights (`600`) with tight tracking (`-0.025em`) to project institutional firmness without sacrificing horizontal compaction.

## Layout & Spacing

The architecture operates on an unyielding 4px baseline sub-grid, scaling in multiples of 8px for containers and spatial structural blocks.

### Layout Philosophy
- **Split Fixed-Fluid Workspace:** A fixed-width dual-pane configuration (`18rem` navigation and folder taxonomy on the left, fluid data-grid workspace in the center-right, optional contextual audit rail on the far right).
- **Zero-Margin Viewports:** Enterprise workflows maximize screenspace. Full-bleed data tables touch outer container edges with hairline dividers rather than floating in isolated padded islands.
- **Breakpoints:**
  - **Desktop Large (≥1600px):** Simultaneous display of Hierarchical Folder Tree, Deep Virtual Data Room File Grid, and Real-Time Bidder Telemetry Sidebar.
  - **Desktop Standard (1280px - 1599px):** Three-column layout collapses the telemetry sidebar into an expandable slide-out drawer.
  - **Tablet/Restricted Viewport (1024px - 1279px):** Folder tree retracts to a compact icon-plus-level column; table horizontal scroll enabled with sticky file-name columns.

## Elevation & Depth

This design system rejects deep drop shadows and skeuomorphic gradients in favor of **Tonal Layering** and **Microscopic Hairline Dividers** (`1px solid #E2E8F0` on light surfaces; `1px solid #1E293B` on navy command surfaces).

### Spatial Tiers
1. **Base Deck (`#F8FAFC`):** The master canvas supporting the application frame.
2. **Surface Canvas (`#FFFFFF`):** Work surfaces, data table bodies, and folder tree containers. Bordered, never shadowed.
3. **Command Surface (`#0A192F`):** Anchored headers, top command panels, and persistent status bars. Distinct by tone, establishing an authoritative crown.
4. **Contextual Overlays & Popovers:** For document previews, permission inspector modals, and bulk action drawers, use minimal, high-precision ambient shadows:
   - `box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.06), 0 4px 12px 0 rgba(15, 23, 42, 0.08)`
   - Border: `1px solid #CBD5E1`

## Shapes

The interface expresses a clean, architectural geometry utilizing `roundedness: 1` (`0.25rem` / `4px`). 

- Standard interactive controls (buttons, inputs, select triggers, table cells) adhere to a 4px corner radius to maintain a crisp, engineered profile.
- Compact security tags, DRM status pills, and audit pills utilize a slightly elevated 4px radius with tight internal padding (`2px 6px`).
- Modal surfaces and KPI summary containers strictly cap their radius at 6px (`rounded-md`). Pill shapes (`rounded-full`) are banned except for circular avatar initials and live audit indicator dots.

## Components

### Buttons & Action Controls
- **Primary Sovereign Action:** Solid `#1D4ED8` background, `#FFFFFF` text, 4px radius, 32px standard height (`padding: 0 12px`), bold 13px label. Hover state darkens to `#1E40AF`.
- **Secondary Institutional:** Surface `#FFFFFF`, border `1px solid #CBD5E1`, text `#1E293B`. Hover shifts background to `#F8FAFC`.
- **Clean Team Restricted Action:** Border `1px solid #FCA5A5`, surface `#FEF2F2`, text `#991B1B`. Hover shifts to `#FEE2E2`.

### Security Badges & Micro-Pills
- **DRM Protected:** Background `#EFF6FF`, border `1px solid #BFDBFE`, text `#1E40AF`, JetBrains Mono 11px uppercase.
- **Dynamic Watermark Active:** Background `#F8FAFC`, border `1px solid #CBD5E1`, text `#475569`, accompanied by an etched lock icon.
- **Clean Team Only:** Background `#FEF2F2`, border `1px solid #FECACA`, text `#991B1B`, weight 600.
- **Audit Synchronized:** Monospaced emerald indicator `#059669` with a 6px pulse dot.

### KPI Deal Health & Engagement Cards
- Structure: White surface bounded by `1px solid #E2E8F0` hairline border, 16px internal padding.
- Metric display: Compact title (12px, `#64748B`, uppercase), large tabular metric (24px, `#0F172A`, weight 600), accompanied by inline delta indicators.
- Embedded visualizations: Inline 32px height sparklines (rendered in `#1D4ED8` with zero-fill area), and radial circular SVG completion rings (`#059669`) illustrating bidder review percentages.

### Precision Data Table
- Row density: 36px compact height; 44px relaxed height for multi-stakeholder views.
- Headers: Background `#F8FAFC`, 11px uppercase `#475569`, letter spacing `0.05em`, border bottom `1px solid #CBD5E1`.
- Row styling: Alternating hover state `#F1F5F9`. Selected rows carry an inset 2px left border in `#1D4ED8`.
- Cell Alignment: Text left-aligned; all dates, file sizes, clearance percentages, and hashes right-aligned in tabular monospaced font.

### Hierarchical Diligence Folder Tree
- Item indentation: Strict 16px steps per nesting depth with `1px solid #E2E8F0` vertical tree guides.
- Node elements: Document/folder icon with clearance badge, node index (`01.02.04`), entity title, item count tag (`[42 items]`), and small inline progress bar representing legal clearance rate.

### Security Command Bar
- Positioned persistently at the topmost horizon: 52px height, background `#0A192F`, border-bottom `1px solid #1E293B`.
- Features: Real-time cryptographic ledger status, Role Impersonation Switcher (e.g., "Viewing as: Buyer Counsel A - Restricted"), clean-team security banner, and immediate Session Termination control.