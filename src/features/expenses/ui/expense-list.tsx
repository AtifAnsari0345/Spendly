"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { formatHumanDate } from "@/lib/format/date";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { CategoryBadge } from "@/components/ui/category-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useSpendly } from "@/app/spendly-provider";
import type { Expense } from "@/features/expenses/models/expense";
import type { ExpenseFilters } from "@/features/expenses/models/expense";
import {
  CategoryIcon,
  resolveCategoryColor,
} from "@/features/categories/ui/category-visuals";

export type ExpenseListProps = {
  items?: Expense[];
  limit?: number;
  viewAllLabel?: string;
  onViewAll?: () => void;
  filters?: ExpenseFilters;
  header?: React.ReactNode;
  showActions?: boolean;
  emptyEyebrow?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
};

export function ExpenseList({
  items: itemsProp,
  limit,
  viewAllLabel,
  onViewAll,
  filters,
  header,
  showActions = true,
  emptyEyebrow = "Expenses",
  emptyTitle = "No expenses yet.",
  emptyDescription = "Tap Add Expense to record your first spending. Saved expenses will appear here.",
  emptyAction,
}: ExpenseListProps) {
  const {
    expenses,
    categories,
    listExpenses,
    openEditModal,
    deleteExpense,
    pushToast,
  } = useSpendly();
  const { format: formatCurrency } = useFormatCurrency();

  const categoriesById = useMemo(() => {
    const map = new Map<string, (typeof categories)[number]>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const items = useMemo(() => {
    const source = itemsProp ?? listExpenses(filters);
    return typeof limit === "number" ? source.slice(0, limit) : source;
  }, [itemsProp, listExpenses, filters, limit]);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const deletingExpense = deletingId
    ? expenses.find((e) => e.id === deletingId) ?? null
    : null;

  async function handleConfirmDelete() {
    if (!deletingId) {
      return;
    }
    setConfirming(true);
    try {
      await deleteExpense(deletingId);
      setDeletingId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete expense";
      pushToast({
        kind: "error",
        title: "Could not delete",
        description: message,
      });
    } finally {
      setConfirming(false);
    }
  }

  if (expenses.length === 0) {
    return (
      <EmptyState
        eyebrow={emptyEyebrow}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  if (items.length === 0) {
    return (
      <Card className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
          {emptyEyebrow}
        </p>
        <h3 className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
          Nothing matches these filters.
        </h3>
        <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
          Try clearing filters or selecting a different date range.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-subtle md:block">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-full border-collapse text-left">
            <thead className="bg-[var(--color-surface-subtle)]">
              <tr className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                <th scope="col" className="px-5 py-3">
                  Title
                </th>
                <th scope="col" className="px-5 py-3">
                  Category
                </th>
                <th scope="col" className="px-5 py-3">
                  Date
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  Amount
                </th>
                {showActions ? (
                  <th scope="col" className="px-5 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {items.map((expense) => {
                const category = categoriesById.get(expense.categoryId);
                const color = category
                  ? resolveCategoryColor(category.colorToken)
                  : resolveCategoryColor("zinc");

                return (
                  <tr
                    key={expense.id}
                    className="transition-colors hover:bg-[var(--color-surface-subtle)]/60"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                            color.softBg,
                            color.fg,
                          )}
                        >
                          <CategoryIcon
                            icon={category?.icon ?? "dots"}
                            size={16}
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="line-clamp-1 [overflow-wrap:anywhere] text-sm font-medium text-[var(--color-foreground)]">
                            {expense.title}
                          </p>
                          {expense.note ? (
                            <p className="line-clamp-1 [overflow-wrap:anywhere] text-xs text-[var(--color-muted-foreground)]">
                              {expense.note}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {category ? (
                        <CategoryBadge category={category} size="sm" />
                      ) : (
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-sm text-[var(--color-muted-foreground)]">
                      {formatHumanDate(expense.date)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                        {formatCurrency(expense.amount)}
                      </p>
                    </td>
                    {showActions ? (
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            className="h-9 px-2.5 text-xs"
                            onClick={() => openEditModal(expense)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-9 px-2.5 text-xs text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                            onClick={() => setDeletingId(expense.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {typeof limit === "number" && expenses.length > limit && onViewAll ? (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-subtle)]/40 px-5 py-3">
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Showing {limit} of {expenses.length} expenses
            </p>
            <Button variant="secondary" onClick={onViewAll} className="h-9 px-4 text-xs">
              {viewAllLabel ?? "View all"}
            </Button>
          </div>
        ) : null}
      </div>

      {/* Mobile Cards */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:hidden">
        {items.map((expense) => {
          const category = categoriesById.get(expense.categoryId);
          const color = category
            ? resolveCategoryColor(category.colorToken)
            : resolveCategoryColor("zinc");

          return (
            <Card key={expense.id} className="min-w-0 space-y-4 p-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                    color.softBg,
                    color.fg,
                  )}
                >
                  <CategoryIcon icon={category?.icon ?? "dots"} size={16} />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                        {expense.title}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {formatHumanDate(expense.date)}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>
                  {expense.note ? (
                    <p className="line-clamp-2 text-xs leading-5 text-[var(--color-muted-foreground)]">
                      {expense.note}
                    </p>
                  ) : null}
                  <div className="pt-1">
                    {category ? (
                      <CategoryBadge category={category} size="sm" />
                    ) : null}
                  </div>
                </div>
              </div>

              {showActions ? (
                <div className="flex gap-2 border-t border-[var(--color-border)] pt-3">
                  <Button
                    variant="secondary"
                    className="flex-1 h-10 text-xs"
                    onClick={() => openEditModal(expense)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 h-10 text-xs text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                    onClick={() => setDeletingId(expense.id)}
                  >
                    Delete
                  </Button>
                </div>
              ) : null}
            </Card>
          );
        })}

        {typeof limit === "number" && expenses.length > limit && onViewAll ? (
          <Button variant="secondary" onClick={onViewAll} className="w-full">
            {viewAllLabel ?? `View all ${expenses.length} expenses`}
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(deletingExpense)}
        onClose={() => {
          if (confirming) {
            return;
          }
          setDeletingId(null);
        }}
        confirming={confirming}
        onConfirm={handleConfirmDelete}
        tone="danger"
        title="Delete this expense?"
        description={
          deletingExpense ? (
            <div className="space-y-2">
              <p>
                This will permanently remove{" "}
                <span className="font-medium text-[var(--color-foreground)]">
                  “{deletingExpense.title}”
                </span>{" "}
                for{" "}
                <span className="font-medium tabular-nums text-[var(--color-foreground)]">
                  {formatCurrency(deletingExpense.amount)}
                </span>{" "}
                from your records.
              </p>
              <p className="opacity-80">
                Totals and lists will update immediately. This cannot be undone.
              </p>
            </div>
          ) : null
        }
        confirmLabel="Delete"
        cancelLabel="Keep expense"
      />
    </div>
  );
}
