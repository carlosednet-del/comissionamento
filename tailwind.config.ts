import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./server/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Brand palette — driven by CSS custom properties in globals.css.
         * The <alpha-value> placeholder lets Tailwind opacity modifiers work,
         * e.g. bg-brand-accent/30, shadow-brand-primary/25. */
        brand: {
          primary:      "hsl(var(--brand-primary)      / <alpha-value>)",
          hover:        "hsl(var(--brand-primary-hover) / <alpha-value>)",
          accent:       "hsl(var(--brand-accent)        / <alpha-value>)",
          "bg-light":   "hsl(var(--brand-bg-light)      / <alpha-value>)",
          "bg-mid":     "hsl(var(--brand-bg-mid)        / <alpha-value>)",
          "bg-base":    "hsl(var(--brand-bg-base)       / <alpha-value>)",
          "text-dark":  "hsl(var(--brand-text-dark)     / <alpha-value>)",
          "text-body":  "hsl(var(--brand-text-body)     / <alpha-value>)",
          "text-muted": "hsl(var(--brand-text-muted)    / <alpha-value>)",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
