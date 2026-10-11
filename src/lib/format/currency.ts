import { env } from "@/config/env";
import { siteConfig } from "@/config/site";
import { DEFAULT_LOCALE } from "@/lib/user-preferences/types";

/**
 * Digit grouping is a property of the locale, not of the currency: formatting a
 * dollar amount with the app's Indian locale produced "$12,34,567.50". Each
 * currency therefore resolves to the regional English locale it is normally
 * written in, which keeps Latin digits and the "." decimal separator used
 * everywhere else in the UI while grouping the amount correctly.
 */
const LOCALE_BY_CURRENCY: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  AED: "en-AE",
  SAR: "en-SA",
};

export function formatCurrency(
  value: number,
  currency = env.NEXT_PUBLIC_DEFAULT_CURRENCY,
  locale = env.NEXT_PUBLIC_DEFAULT_LOCALE ?? siteConfig.locale,
) {
  // The stored locale is the app default (there is no locale picker in the UI),
  // so a stored default must not force Indian grouping onto other currencies.
  // An explicitly different locale still wins.
  const resolvedLocale =
    locale && locale !== DEFAULT_LOCALE
      ? locale
      : (LOCALE_BY_CURRENCY[currency] ?? locale);

  return new Intl.NumberFormat(resolvedLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
