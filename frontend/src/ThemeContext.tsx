import { createContext, useContext, useEffect, useState } from "react";
import { themes, type Theme } from "./themes";

interface ThemeContextValue {
  themeId: string;
  setThemeId: (id: string) => void;
  currentTheme: Theme;
}

const ThemeContext = createContext<ThemeContextValue>(null!);

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  const vars = getSystemDark() ? theme.dark : theme.light;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

// Collect all possible variable keys across all themes so we clear everything on switch
const ALL_VAR_KEYS = new Set(
  themes.flatMap((t) => [...Object.keys(t.light), ...Object.keys(t.dark)]),
);

function clearAllThemeVars() {
  const root = document.documentElement;
  for (const key of ALL_VAR_KEYS) {
    root.style.removeProperty(key);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState(() => {
    return localStorage.getItem("theme") || "aurore";
  });

  const currentTheme = themes.find((t) => t.id === themeId) || themes[0];

  const setThemeId = (id: string) => {
    setThemeIdState(id);
    localStorage.setItem("theme", id);
  };

  // Apply theme vars on mount, change, and when OS color scheme changes
  useEffect(() => {
    clearAllThemeVars();
    applyTheme(currentTheme);
    document.documentElement.setAttribute("data-theme", currentTheme.id);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      clearAllThemeVars();
      applyTheme(currentTheme);
    };
    mql.addEventListener("change", handler);
    return () => {
      mql.removeEventListener("change", handler);
      clearAllThemeVars();
    };
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
