"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useSpendly } from "@/app/spendly-provider";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  NumberInput,
  Select,
  TextInput,
} from "@/components/ui/form-fields";
import { ExpenseList } from "@/features/expenses/ui/expense-list";
import { CategoryChip } from "@/components/ui/category-badge";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { calculateTotalExpenses } from "@/lib/analytics/expense-metrics";
import type { Expense } from "@/features/expenses/models/expense";
import type { ExpenseFilters } from "@/features/expenses/models/expense";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Date: newest first" },
  { value: "date-asc", label: "Date: oldest first" },
  { value: "amount-desc", label: "Amount: high to low" },
  { value: "amount-asc", label: "Amount: low to high" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

function applySort(expenses: Expense[], sort: SortKey) {
  const copy = [...expenses];
  switch (sort) {
    case "date-asc":
      copy.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt.localeCompare(b.createdAt)));
      break;
    case "amount-desc":
      copy.sort((a, b) => (b.amount > a.amount ? 1 : b.amount < a.amount ? -1 : a.date.localeCompare(b.date)));
      break;
    case "amount-asc":
      copy.sort((a, b) => (a.amount < b.amount ? -1 : a.amount > b.amount ? 1 : a.date.localeCompare(b.date)));
      break;
    case "date-desc":
    default:
      copy.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt)));
  }
  return copy;
}

export default function ExpensesPage() {
  const { categories, listExpenses, openAddModal } = useSpendly();
  const { format: formatCurrency } = useFormatCurrency();

  const [query, setQuery] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("date-desc");

  const filters = useMemo<ExpenseFilters>(() => {
    const f: ExpenseFilters = {};
    if (query.trim()) {
      f.query = query.trim();
    }
    if (selectedCategoryIds.length > 0) {
      f.categoryIds = selectedCategoryIds;
    }
    if (minAmount.trim() !== "") {
      const n = Number(minAmount);
      if (Number.isFinite(n) && n >= 0) {
        f.minAmount = n;
      }
    }
    if (maxAmount.trim() !== "") {
      const n = Number(maxAmount);
      if (Number.isFinite(n) && n >= 0) {
        f.maxAmount = n;
      }
    }
    if (from) {
      f.from = from;
    }
    if (to) {
      f.to = to;
    }
    return f;
  }, [query, selectedCategoryIds, minAmount, maxAmount, from, to]);

  const filtered = useMemo(() => {
    const all = listExpenses(filters);
    return applySort(all, sort);
  }, [listExpenses, filters, sort]);

  const totalFiltered = useMemo(
    () => calculateTotalExpenses(filtered),
    [filtered],
  );

  const activeFilterCount =
    (query.trim() ? 1 : 0) +
    (minAmount.trim() || maxAmount.trim() ? 1 : 0) +
    (from || to ? 1 : 0) +
    selectedCategoryIds.length;

  function clearFilters() {
    setQuery("");
    setMinAmount("");
    setMaxAmount("");
    setFrom("");
    setTo("");
    setSelectedCategoryIds([]);
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Expenses"
        title="Search, filter, and manage every expense."
        description="All your entries are searchable and sortable. Tap any row to edit or delete. Changes apply to all totals and future reports instantly."
      />

      <Card className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              Filters
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              <span className="font-medium text-[var(--color-foreground)] tabular-nums">
                {filtered.length}
              </span>{" "}
              {filtered.length === 1 ? "expense" : "expenses"} ·{" "}
              <span className="font-medium text-[var(--color-foreground)] tabular-nums">
                {formatCurrency(totalFiltered)}
              </span>{" "}
              total
              {activeFilterCount > 0 ? (
                <span className="ml-2 rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent)]">
                  {activeFilterCount} active
                </span>
              ) : null}
            </p>
          </div>
          {activeFilterCount > 0 ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="h-9 px-3 text-xs" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <label
              htmlFor="exp-query"
              className="block text-xs font-semibold tracking-wide text-[var(--color-foreground)]"
            >
              Search
            </label>
            <TextInput
              id="exp-query"
              type="search"
              placeholder="Search titles and notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="exp-sort"
              className="block text-xs font-semibold tracking-wide text-[var(--color-foreground)]"
            >
              Sort by
            </label>
            <Select
              id="exp-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold tracking-wide text-[var(--color-foreground)]">
              Amount range
            </label>
            <div className="flex items-center gap-2">
              <NumberInput
                aria-label="Minimum amount"
                placeholder="Min"
                min="0"
                step="1"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
              <span className="text-xs text-[var(--color-muted-foreground)]">–</span>
              <NumberInput
                aria-label="Maximum amount"
                placeholder="Max"
                min="0"
                step="1"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="exp-from"
              className="block text-xs font-semibold tracking-wide text-[var(--color-foreground)]"
            >
              From
            </label>
            <input
              id="exp-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={cn(
                "w-full min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-soft)]",
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="exp-to"
              className="block text-xs font-semibold tracking-wide text-[var(--color-foreground)]"
            >
              To
            </label>
            <input
              id="exp-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={cn(
                "w-full min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-foreground)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-soft)]",
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-foreground)]">
            Categories
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const selected = selectedCategoryIds.includes(cat.id);
              return (
                <CategoryChip
                  key={cat.id}
                  category={cat}
                  selected={selected}
                  onClick={() => toggleCategory(cat.id)}
                />
              );
            })}
          </div>
        </div>
      </Card>

      <ExpenseList
        items={filtered}
        emptyEyebrow="Expense list"
        emptyTitle="No expenses yet."
        emptyDescription="Add an expense from anywhere in Spendly using the Add Expense button. Saved entries appear here with full search, filtering, edit, and delete support."
        emptyAction={<Button onClick={openAddModal}>Add your first expense</Button>}
        header={
          filtered.length > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
                  Results
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {filtered.length} {filtered.length === 1 ? "entry" : "entries"} matching
                  current filters.
                </p>
              </div>
              <Link href="/" className="hidden sm:inline-flex">
                <Button variant="ghost" className="h-9 px-3 text-xs">
                  Back to dashboard
                </Button>
              </Link>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
