"use client";

import { useSpendly } from "@/app/spendly-provider";
import { FieldLabel, Select } from "@/components/ui/form-fields";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { CURRENCY_OPTIONS } from "@/lib/user-preferences/types";

export function CurrencySetting() {
  const { currency, setCurrency, pushToast } = useSpendly();
  const { format } = useFormatCurrency();

  async function selectCurrency(code: string) {
    if (code === currency) {
      return;
    }
    try {
      await setCurrency(code);
    } catch {
      pushToast({
        kind: "error",
        title: "Couldn't save currency",
        description: "Please try again.",
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <FieldLabel htmlFor="settings-currency">Currency</FieldLabel>
        <Select
          id="settings-currency"
          name="settings-currency"
          value={currency}
          onChange={(event) => {
            void selectCurrency(event.target.value);
          }}
        >
          {CURRENCY_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code} — {option.label} ({option.symbol})
            </option>
          ))}
        </Select>
      </div>
      <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
        Applies to the dashboard, expenses, analytics, and reports. Saved
        amounts are stored as numbers, so switching is instant and loss-free.{" "}
        <span className="font-medium text-[var(--color-foreground)]">
          {format(1234.5)}
        </span>{" "}
        is how a sample amount renders right now.
      </p>
    </div>
  );
}
