"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { DEFAULT_THEME, STOREFRONT_THEMES, THEME_STORAGE_KEY, readSavedTheme, resolveTheme, saveTheme } from "@/lib/storefront-theme.mjs";

type ThemeId = "classic" | "motorsport";
const ThemeContext = createContext<{ theme: ThemeId; selectTheme: (theme: ThemeId) => void; saved: boolean } | null>(null);

export function StorefrontThemeProvider({ children, defaultTheme = DEFAULT_THEME }: { children: ReactNode; defaultTheme?: ThemeId }) {
  // Match the static export on first render. Storage is optional, never a prerequisite.
  const [theme, setTheme] = useState<ThemeId>(defaultTheme);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    try { if (window.localStorage.getItem(THEME_STORAGE_KEY) !== null) setTheme(readSavedTheme(window.localStorage)); } catch { /* Disabled browser storage. */ }
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) setTheme(resolveTheme(event.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const selectTheme = (nextTheme: ThemeId) => {
    const next = resolveTheme(nextTheme);
    setTheme(next);
    try { setSaved(saveTheme(window.localStorage, next)); } catch { setSaved(false); }
  };

  return (
    <ThemeContext.Provider value={{ theme, selectTheme, saved }}>
      <MotionConfig reducedMotion="user">
        <div data-storefront-theme={theme}>{children}</div>
      </MotionConfig>
    </ThemeContext.Provider>
  );
}

export function useStorefrontTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("StorefrontThemeProvider is required");
  return value;
}

export function ThemeSwitcher() {
  const { theme, selectTheme, saved } = useStorefrontTheme();
  return (
    <div className="bnp-theme-bar">
      <div className="bnp-theme-bar-inner">
        <fieldset className="bnp-theme-options">
          <legend className="sr-only">Storefront theme</legend>
          <span aria-hidden="true" className="bnp-theme-label">Appearance</span>
          {STOREFRONT_THEMES.map((item) => (
            <label key={item.id} className="bnp-theme-option">
              <input type="radio" name="storefront-theme" value={item.id} checked={theme === item.id} onChange={() => selectTheme(resolveTheme(item.id))} />
              <span>{item.label}</span>
            </label>
          ))}
        </fieldset>
        <span className="bnp-theme-note" role="status" aria-live="polite">
          {saved ? "Appearance only · Your plate stays the same" : "Theme applied for this visit · Browser storage unavailable"}
        </span>
      </div>
    </div>
  );
}
