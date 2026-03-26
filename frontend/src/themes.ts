// Each theme overrides only the accent/surface/bg CSS variables.
// The rest of the design system (radius, shadows, typography, glass) stays untouched.

export interface Theme {
  id: string;
  labelKey: string; // i18n key
  // preview colors used to render the mini-card in settings
  preview: { bg: string; sidebar: string; accent: string; card: string };
  // CSS variable overrides — light mode
  light: Record<string, string>;
  // CSS variable overrides — dark mode
  dark: Record<string, string>;
}

export const themes: Theme[] = [
  {
    id: "aurore",
    labelKey: "settings.themes.aurore",
    preview: { bg: "#f0f2f7", sidebar: "#e8eaf6", accent: "#6366f1", card: "#ffffff" },
    light: {
      "--accent": "#6366f1",
      "--accent-hover": "#4f46e5",
      "--accent-light": "rgba(99, 102, 241, 0.10)",
      "--accent-glow": "rgba(99, 102, 241, 0.24)",
      "--gradient-accent": "linear-gradient(135deg, #6366f1, #8b5cf6)",
      "--gradient-accent-hover": "linear-gradient(135deg, #4f46e5, #7c3aed)",
      "--shadow-accent": "0 4px 20px rgba(99, 102, 241, 0.20)",
      "--tag-bg": "rgba(99, 102, 241, 0.10)",
      "--tag-text": "#4f46e5",
      "--bg": "#f0f2f7",
      "--bg-mesh": "linear-gradient(135deg, #e8eaf6 0%, #f0f2f7 40%, #e3f2fd 70%, #ede7f6 100%)",
    },
    dark: {
      "--accent": "#818cf8",
      "--accent-hover": "#6366f1",
      "--accent-light": "rgba(129, 140, 248, 0.12)",
      "--accent-glow": "rgba(129, 140, 248, 0.20)",
      "--gradient-accent": "linear-gradient(135deg, #818cf8, #a78bfa)",
      "--gradient-accent-hover": "linear-gradient(135deg, #6366f1, #8b5cf6)",
      "--shadow-accent": "0 4px 20px rgba(129, 140, 248, 0.15)",
      "--tag-bg": "rgba(129, 140, 248, 0.15)",
      "--tag-text": "#a5b4fc",
      "--bg": "#0c0f1a",
      "--bg-mesh": "linear-gradient(135deg, #0c0f1a 0%, #111827 40%, #0f172a 70%, #1a1033 100%)",
    },
  },
  {
    id: "sakura",
    labelKey: "settings.themes.sakura",
    preview: { bg: "#fdf2f8", sidebar: "#fce7f3", accent: "#ec4899", card: "#ffffff" },
    light: {
      "--accent": "#ec4899",
      "--accent-hover": "#db2777",
      "--accent-light": "rgba(236, 72, 153, 0.10)",
      "--accent-glow": "rgba(236, 72, 153, 0.24)",
      "--gradient-accent": "linear-gradient(135deg, #ec4899, #f472b6)",
      "--gradient-accent-hover": "linear-gradient(135deg, #db2777, #ec4899)",
      "--shadow-accent": "0 4px 20px rgba(236, 72, 153, 0.20)",
      "--tag-bg": "rgba(236, 72, 153, 0.10)",
      "--tag-text": "#db2777",
      "--bg": "#fdf2f8",
      "--bg-mesh": "linear-gradient(135deg, #fce7f3 0%, #fdf2f8 40%, #fff1f2 70%, #fce7f3 100%)",
    },
    dark: {
      "--accent": "#f472b6",
      "--accent-hover": "#ec4899",
      "--accent-light": "rgba(244, 114, 182, 0.12)",
      "--accent-glow": "rgba(244, 114, 182, 0.20)",
      "--gradient-accent": "linear-gradient(135deg, #f472b6, #fb7185)",
      "--gradient-accent-hover": "linear-gradient(135deg, #ec4899, #f472b6)",
      "--shadow-accent": "0 4px 20px rgba(244, 114, 182, 0.15)",
      "--tag-bg": "rgba(244, 114, 182, 0.15)",
      "--tag-text": "#f9a8d4",
      "--bg": "#1a0a14",
      "--bg-mesh": "linear-gradient(135deg, #1a0a14 0%, #1f0c1a 40%, #1a0f1e 70%, #200a18 100%)",
    },
  },
  {
    id: "cyberpunk",
    labelKey: "settings.themes.cyberpunk",
    preview: { bg: "#0a0e1a", sidebar: "#0d1224", accent: "#06b6d4", card: "#111827" },
    light: {
      "--accent": "#0891b2",
      "--accent-hover": "#0e7490",
      "--accent-light": "rgba(8, 145, 178, 0.10)",
      "--accent-glow": "rgba(6, 182, 212, 0.30)",
      "--gradient-accent": "linear-gradient(135deg, #06b6d4, #8b5cf6)",
      "--gradient-accent-hover": "linear-gradient(135deg, #0891b2, #7c3aed)",
      "--shadow-accent": "0 4px 20px rgba(6, 182, 212, 0.25)",
      "--tag-bg": "rgba(6, 182, 212, 0.10)",
      "--tag-text": "#0e7490",
      "--bg": "#f0f9ff",
      "--bg-mesh": "linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #ede9fe 70%, #e0f2fe 100%)",
    },
    dark: {
      "--accent": "#22d3ee",
      "--accent-hover": "#06b6d4",
      "--accent-light": "rgba(34, 211, 238, 0.12)",
      "--accent-glow": "rgba(34, 211, 238, 0.30)",
      "--gradient-accent": "linear-gradient(135deg, #22d3ee, #a78bfa)",
      "--gradient-accent-hover": "linear-gradient(135deg, #06b6d4, #8b5cf6)",
      "--shadow-accent": "0 4px 20px rgba(34, 211, 238, 0.25)",
      "--tag-bg": "rgba(34, 211, 238, 0.15)",
      "--tag-text": "#67e8f9",
      "--bg": "#0a0e1a",
      "--bg-mesh": "linear-gradient(135deg, #0a0e1a 0%, #0d1224 40%, #0c0a20 70%, #0a1018 100%)",
    },
  },
  {
    id: "forest",
    labelKey: "settings.themes.forest",
    preview: { bg: "#f0fdf4", sidebar: "#dcfce7", accent: "#10b981", card: "#ffffff" },
    light: {
      "--accent": "#10b981",
      "--accent-hover": "#059669",
      "--accent-light": "rgba(16, 185, 129, 0.10)",
      "--accent-glow": "rgba(16, 185, 129, 0.24)",
      "--gradient-accent": "linear-gradient(135deg, #10b981, #34d399)",
      "--gradient-accent-hover": "linear-gradient(135deg, #059669, #10b981)",
      "--shadow-accent": "0 4px 20px rgba(16, 185, 129, 0.20)",
      "--tag-bg": "rgba(16, 185, 129, 0.10)",
      "--tag-text": "#059669",
      "--bg": "#f0fdf4",
      "--bg-mesh": "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 40%, #ecfdf5 70%, #d1fae5 100%)",
    },
    dark: {
      "--accent": "#34d399",
      "--accent-hover": "#10b981",
      "--accent-light": "rgba(52, 211, 153, 0.12)",
      "--accent-glow": "rgba(52, 211, 153, 0.20)",
      "--gradient-accent": "linear-gradient(135deg, #34d399, #6ee7b7)",
      "--gradient-accent-hover": "linear-gradient(135deg, #10b981, #34d399)",
      "--shadow-accent": "0 4px 20px rgba(52, 211, 153, 0.15)",
      "--tag-bg": "rgba(52, 211, 153, 0.15)",
      "--tag-text": "#6ee7b7",
      "--bg": "#0a1a12",
      "--bg-mesh": "linear-gradient(135deg, #0a1a12 0%, #0c1f17 40%, #0a1a14 70%, #0d1f12 100%)",
    },
  },
];
