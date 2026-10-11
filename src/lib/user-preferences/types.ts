export type ThemeMode = "system" | "light" | "dark";

export const DEFAULT_THEME: ThemeMode = "system";
export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_LOCALE = "en-IN";

export type UserPreferenceSnapshot = {
  theme: ThemeMode;
  currency: string;
  locale: string;
};

export const CURRENCY_OPTIONS: Array<{ code: string; label: string; symbol: string }> = [
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", label: "Saudi Riyal", symbol: "ر.س" },
];
