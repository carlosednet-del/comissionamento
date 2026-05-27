"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

type ColorTheme = "blue-tech" | "petroleum";

const STORAGE_KEY = "color-theme";
const LABELS: Record<ColorTheme, string> = {
  "blue-tech": "Blue Tech",
  petroleum: "Petróleo",
};

/** Reads and applies the saved theme from localStorage. */
function applyTheme(theme: ColorTheme) {
  if (theme === "petroleum") {
    document.documentElement.setAttribute("data-theme", "petroleum");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Floating palette-switcher button.
 * Renders as a pill in the top-right corner of whatever page uses it.
 * Persists the choice in localStorage and applies it via a data-theme
 * attribute on <html>, which triggers the CSS variable overrides in
 * globals.css.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<ColorTheme>("blue-tech");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
    const active = saved === "petroleum" ? "petroleum" : "blue-tech";
    setTheme(active);
    applyTheme(active);
    setMounted(true);
  }, []);

  function toggle() {
    const next: ColorTheme = theme === "blue-tech" ? "petroleum" : "blue-tech";
    setTheme(next);
    applyTheme(next);
  }

  // Avoid hydration mismatch — render nothing until client is ready.
  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      title={`Trocar para paleta ${LABELS[theme === "blue-tech" ? "petroleum" : "blue-tech"]}`}
      className="
        fixed right-4 top-4 z-50
        flex items-center gap-2
        rounded-full
        border border-brand-bg-light
        bg-white/70 backdrop-blur-sm
        px-3.5 py-2
        text-xs font-semibold text-brand-text-body
        shadow-sm shadow-brand-primary/10
        transition-all
        hover:border-brand-hover hover:text-brand-primary hover:shadow-md
        active:scale-95
      "
    >
      <Palette className="h-3.5 w-3.5 text-brand-primary" strokeWidth={2} />
      {LABELS[theme]}
    </button>
  );
}
