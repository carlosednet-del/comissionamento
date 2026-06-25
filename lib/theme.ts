/**
 * Theme palette reference — Gestor de Demandas Técnicas
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  HOW TO SWITCH PALETTES                                         │
 * │                                                                 │
 * │  Open  app/globals.css  and inside :root{}:                     │
 * │  1. Comment out the "Blue Tech" block                           │
 * │  2. Uncomment the "Petróleo / Graphite" block                   │
 * │                                                                 │
 * │  That's it — every component updates automatically because      │
 * │  all colors are consumed via Tailwind's `brand-*` utility       │
 * │  classes (e.g. bg-brand-primary, text-brand-text-dark), which   │
 * │  resolve to CSS custom properties at runtime.                   │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * The objects below are reference documentation for each palette.
 * The CSS variable names match the keys defined in tailwind.config.ts.
 */

export type BrandToken =
  | "primary"        // main action color   — buttons, icon bg
  | "hover"          // button hover / darker tone
  | "accent"         // lighter accent      — blur elements, focus ring
  | "bg-light"       // lightest background — card border, badge bg
  | "bg-mid"         // mid-tone bg         — gradient endpoint, blur
  | "bg-base"        // page base color     — gradient center
  | "text-dark"      // headings / labels
  | "text-body"      // body / descriptions
  | "text-muted";    // placeholders / footer

/** CSS variable name → hex reference value for the Blue Tech palette */
export const BLUE_TECH: Record<BrandToken, string> = {
  "primary":      "#005C99",
  "hover":        "#007EB5",
  "accent":       "#71B7D5",
  "bg-light":     "#DCE9F0",
  "bg-mid":       "#AFC2D0",
  "bg-base":      "#F8FBFD",
  "text-dark":    "#1A2E3B",
  "text-body":    "#315A70",
  "text-muted":   "#87ACB9",
};

/** CSS variable name → hex reference value for the Petróleo / Graphite palette */
export const PETROLEUM: Record<BrandToken, string> = {
  "primary":      "#315A70",
  "hover":        "#3F8298",
  "accent":       "#87ACB9",
  "bg-light":     "#D3D8DD",
  "bg-mid":       "#274455",
  "bg-base":      "#FFFFFF",
  "text-dark":    "#1A2C36",
  "text-body":    "#3F5A6A",
  "text-muted":   "#87ACB9",
};
