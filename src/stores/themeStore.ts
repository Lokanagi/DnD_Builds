import { create } from "zustand";

export type Theme = "light" | "dark";

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem("steinhart-theme");
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const initialTheme: Theme =
  readStoredTheme() ?? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
applyThemeClass(initialTheme);

type ThemeStore = {
  theme: Theme;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initialTheme,
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyThemeClass(next);
    try {
      localStorage.setItem("steinhart-theme", next);
    } catch {
      // per-viewer convenience only — fine if it doesn't persist
    }
    set({ theme: next });
  },
}));
