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

function clearThemeVars(theme: Theme) {
  const root = document.documentElement;
  const allKeys = new Set([...Object.keys(theme.light), ...Object.keys(theme.dark)]);
  for (const key of allKeys) {
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
    applyTheme(currentTheme);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(currentTheme);
    mql.addEventListener("change", handler);
    return () => {
      mql.removeEventListener("change", handler);
      clearThemeVars(currentTheme);
    };
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
