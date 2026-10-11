import type { ThemeMode } from "./types";

export function applyThemeToDocument(mode: ThemeMode): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const root = document.documentElement;
  root.setAttribute("data-theme", mode);

  try {
    if (mode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.style.colorScheme = prefersDark ? "dark" : "light";
      return;
    }
    root.style.colorScheme = mode;
  } catch {
    // Ignore media-query or style assignment failures in restricted contexts.
  }
}
