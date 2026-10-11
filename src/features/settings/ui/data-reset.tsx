"use client";

import { useState } from "react";

import { useSpendly } from "@/app/spendly-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

export function DataReset() {
  const { expenses, categories, isSeededCategory, clearAllData, pushToast } =
    useSpendly();

  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const customCount = categories.filter(
    (category) => !isSeededCategory(category.id),
  ).length;

  async function handleConfirm() {
    setConfirming(true);
    try {
      await clearAllData();
      setOpen(false);
    } catch {
      pushToast({
        kind: "error",
        title: "Couldn't clear data",
        description: "Please try again.",
      });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-4 sm:px-5">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            Clear all data
          </p>
          <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
            Deletes all{" "}
            <span className="tabular-nums">{expenses.length}</span>{" "}
            {expenses.length === 1 ? "expense" : "expenses"} and{" "}
            <span className="tabular-nums">{customCount}</span> custom{" "}
            {customCount === 1 ? "category" : "categories"}, then restores the
            default category set. Your theme and currency preferences are kept.
          </p>
        </div>
        <Button
          variant="secondary"
          className="shrink-0 border-[var(--color-danger)] text-[var(--color-danger)]"
          onClick={() => setOpen(true)}
        >
          Clear all data
        </Button>
      </div>

      <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
        This permanently removes your stored data and cannot be
        undone — you will be asked to confirm first.
      </p>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        confirming={confirming}
        title="Clear all data?"
        confirmLabel="Clear everything"
        cancelLabel="Cancel"
        description={
          <>
            This permanently deletes{" "}
            <span className="font-medium text-[var(--color-foreground)] tabular-nums">
              {expenses.length}
            </span>{" "}
            {expenses.length === 1 ? "expense" : "expenses"} and{" "}
            <span className="font-medium text-[var(--color-foreground)] tabular-nums">
              {customCount}
            </span>{" "}
            custom {customCount === 1 ? "category" : "categories"} from your
            account, then restores the default categories. Theme and currency
            preferences are kept. This cannot be undone.
          </>
        }
      />
    </div>
  );
}
