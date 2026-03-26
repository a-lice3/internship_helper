import { useContext } from "react";
import { ThemeContext } from "./themeContextDef";

export function useTheme() {
  return useContext(ThemeContext);
}
