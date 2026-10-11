"use client";

import { useSpendly } from "@/app/spendly-provider";
import { cn } from "@/lib/cn";
import type { ThemeMode } from "@/lib/user-preferences/types";

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const THEME_HINTS: Record<ThemeMode, string> = {
  system: "Matches your device's light or dark appearance automatically.",
  light: "Always uses the light palette.",
  dark: "Always uses the dark palette.",
};

export function ThemeSetting() {
  const { theme, setTheme, pushToast } = useSpendly();

  async function selectTheme(mode: ThemeMode) {
    if (mode === theme) {
      return;
    }
    try {
      await setTheme(mode);
    } catch {
      pushToast({
        kind: "error",
        title: "Couldn't save theme",
        description: "Please try again.",
      });
    }
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold tracking-wide text-[var(--color-foreground)]">
        Theme
      </legend>
      <div
        className="inline-flex flex-wrap gap-1 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-1"
        role="group"
        aria-label="Theme options"
      >
        {THEME_OPTIONS.map((option) => {
          const id = `settings-theme-${option.value}`;
          const selected = theme === option.value;

          return (
            <span key={option.value}>
              <input
                type="radio"
                id={id}
                name="settings-theme"
                value={option.value}
                checked={selected}
                onChange={() => {
                  void selectTheme(option.value);
                }}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center rounded-xl px-4 text-sm font-medium transition-colors",
                  "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                  "peer-checked:bg-[var(--color-surface)] peer-checked:text-[var(--color-foreground)] peer-checked:shadow-subtle",
                  "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-accent)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-surface)]",
                )}
              >
                {option.label}
              </label>
            </span>
          );
        })}
      </div>
      <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
        {THEME_HINTS[theme]}
      </p>
    </fieldset>
  );
}
