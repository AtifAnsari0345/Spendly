"use client";

import { useMemo } from "react";

import { useSpendly } from "@/app/spendly-provider";
import { formatCurrency } from "@/lib/format/currency";

export function useFormatCurrency() {
  const { currency, locale } = useSpendly();

  return useMemo(
    () => ({
      currency,
      locale,
      format: (value: number, override?: { currency?: string; locale?: string }) =>
        formatCurrency(value, override?.currency ?? currency, override?.locale ?? locale),
    }),
    [currency, locale],
  );
}
