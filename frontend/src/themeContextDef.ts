import { createContext } from "react";
import type { Theme } from "./themes";

export interface ThemeContextValue {
  themeId: string;
  setThemeId: (id: string) => void;
  currentTheme: Theme;
}

export const ThemeContext = createContext<ThemeContextValue>(null!);
