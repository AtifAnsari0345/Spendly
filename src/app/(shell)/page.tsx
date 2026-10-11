"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useSpendly } from "@/app/spendly-provider";
import { PageIntro } from "@/components/page-intro";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { ExpenseList } from "@/features/expenses/ui/expense-list";
import { CategoryBadge } from "@/components/ui/category-badge";
import { resolveCategoryColor } from "@/features/categories/ui/category-visuals";
import { cn } from "@/lib/cn";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import {
  calculateAverageDailySpend,
  calculateCategoryTotals,
  calculateExpenseCount,
  calculateMonthlyComparison,
  calculateTotalExpenses,
  dailyTotals,
  elapsedDaysInMonth,
  filterExpensesByMonth,
  findTopCategory,
  formatMonthLabel,
  getCurrentMonthYear,
  previousMonthExpenses,
} from "@/lib/analytics/expense-metrics";

const MAX_DONUT_CATEGORIES = 5;

const CATEGORY_HEX_PALETTE: Record<string, string> = {
  "amber-500": "#f59e0b",
  "emerald-500": "#10b981",
  "sky-500": "#0ea5e9",
  "violet-500": "#8b5cf6",
  "rose-500": "#f43f5e",
  "slate-500": "#64748b",
  "red-500": "#ef4444",
  "indigo-500": "#6366f1",
  "orange-500": "#f97316",
  "cyan-500": "#06b6d4",
  "purple-500": "#a855f7",
  "pink-500": "#ec4899",
  "zinc-500": "#71717a",
};

function resolveHexFill(colorToken: string): string {
  const color = resolveCategoryColor(colorToken);
  const rawBgTail = color.dot.replace("bg-", "");
  return CATEGORY_HEX_PALETTE[rawBgTail] ?? "#64748b";
}

export default function DashboardPage() {
  const { expenses, categories, loading, initialized } = useSpendly();
  const { format: formatCurrency } = useFormatCurrency();

  const { year, month } = getCurrentMonthYear();

  const monthExpenses = useMemo(
    () => filterExpensesByMonth(expenses, year, month),
    [expenses, year, month],
  );

  const prevMonthExpenses = useMemo(
    () => previousMonthExpenses(expenses, year, month),
    [expenses, year, month],
  );

  const totals = useMemo(() => {
    const total = calculateTotalExpenses(monthExpenses);
    const count = calculateExpenseCount(monthExpenses);
    const dayCount = elapsedDaysInMonth(year, month);
    const avgDaily = calculateAverageDailySpend(monthExpenses, dayCount);
    const top = findTopCategory(monthExpenses, categories);
    const mom = calculateMonthlyComparison(monthExpenses, prevMonthExpenses);
    return { total, count, avgDaily, top, dayCount, mom };
  }, [monthExpenses, prevMonthExpenses, categories, year, month]);

  const daily = useMemo(
    () => dailyTotals(monthExpenses, { year, month }),
    [monthExpenses, year, month],
  );

  const categoryBreakdown = useMemo(() => {
    const entries = calculateCategoryTotals(monthExpenses, categories);
    type PieEntry = {
      category: (typeof entries)[number]["category"];
      total: number;
      label: string;
    };
    const topResults: PieEntry[] = entries
      .slice(0, MAX_DONUT_CATEGORIES)
      .map((entry) => ({
        ...entry,
        label: entry.category.name,
      }));
    if (entries.length > MAX_DONUT_CATEGORIES) {
      const other = entries.slice(MAX_DONUT_CATEGORIES);
      const otherTotal = other.reduce((sum, e) => sum + e.total, 0);
      if (otherTotal > 0.0001) {
        const nowStamp = new Date().toISOString();
        topResults.push({
          category: {
            id: "other",
            name: "Other categories",
            slug: "other",
            icon: "dots",
            colorToken: "slate",
            createdAt: nowStamp,
            updatedAt: nowStamp,
          },
          total: Math.round(otherTotal * 100) / 100,
          label: "Other categories",
        });
      }
    }
    return topResults;
  }, [monthExpenses, categories]);

  const monthLabel = formatMonthLabel(year, month);
  const prevMonthLabel = formatMonthLabel(
    month === 1 ? year - 1 : year,
    month === 1 ? 12 : month - 1,
  );
  const showEmptyMonth =
    initialized && !loading && expenses.length > 0 && monthExpenses.length === 0;
  const hasExpensesAnyMonth = expenses.length > 0;

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageIntro
        eyebrow="Dashboard"
        title={monthLabel}
        description={
          initialized
            ? "A quick overview of how your spending is tracking this month."
            : "Preparing your dashboard…"
        }
      />

      <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total spent"
          value={formatCurrency(totals.total)}
          hint={
            <div className="space-y-1">
              <div>
                {totals.count} {totals.count === 1 ? "expense" : "expenses"} in {monthLabel}
              </div>
              {totals.mom.deltaPct !== null || Math.abs(totals.mom.delta) > 0.0001 ? (
                <div
                  className={cn(
                    "inline-flex items-center gap-1 font-medium",
                    totals.mom.direction === "up"
                      ? "text-rose-600 dark:text-rose-400"
                      : totals.mom.direction === "down"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-[var(--color-muted-foreground)]",
                  )}
                >
                  {totals.mom.direction === "up"
                    ? "▲"
                    : totals.mom.direction === "down"
                      ? "▼"
                      : "■"}
                  {totals.mom.deltaPct !== null ? (
                    <>
                      {" "}
                      {Math.abs(totals.mom.deltaPct)}% vs {prevMonthLabel}
                    </>
                  ) : (
                    <>
                      {" "}
                      {formatCurrency(Math.abs(totals.mom.delta))} vs {prevMonthLabel}
                    </>
                  )}
                </div>
              ) : monthExpenses.length > 0 ? (
                <div className="text-[var(--color-muted-foreground)]">
                  No prior month activity to compare.
                </div>
              ) : null}
            </div>
          }
          accent="accent"
          icon={
            <svg
              viewBox="0 0 24 24"
              width={18}
              height={18}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path d="M12 3.5v17" />
              <path d="M16 6.5H10.5a3 3 0 0 0 0 6h3a3 3 0 0 1 0 6H7.5" />
            </svg>
          }
        />

        <StatCard
          label="Expenses"
          value={String(totals.count)}
          hint={
            totals.count === 0
              ? "Add your first expense to get started."
              : totals.dayCount > 1
                ? `Across ${totals.dayCount} calendar days so far this month`
                : "First day of the month"
          }
          icon={
            <svg
              viewBox="0 0 24 24"
              width={18}
              height={18}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path d="M6 4.5h12v15H6z" />
              <path d="M9 8.5h6M9 12h6M9 15.5h4" />
            </svg>
          }
        />

        <StatCard
          label="Average / day"
          value={formatCurrency(totals.avgDaily)}
          hint={
            totals.count === 0
              ? "No entries recorded yet."
              : `${totals.dayCount} calendar day${totals.dayCount === 1 ? "" : "s"} in ${monthLabel}`
          }
          icon={
            <svg
              viewBox="0 0 24 24"
              width={18}
              height={18}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path d="M5 18.5h14" />
              <path d="M8 16V11" />
              <path d="M12 16V7.5" />
              <path d="M16 16v-5" />
            </svg>
          }
        />

        <StatCard
          label="Top category"
          value={
            totals.top ? (
              <span className="text-xl sm:text-2xl">{totals.top.category.name}</span>
            ) : (
              <span className="text-[var(--color-muted-foreground)]">—</span>
            )
          }
          hint={
            totals.top ? (
              <div className="flex flex-wrap items-center gap-2">
                <span>{formatCurrency(totals.top.total)}</span>
                <CategoryBadge category={totals.top.category} size="sm" />
              </div>
            ) : (
              "Activity across categories appears here."
            )
          }
          icon={
            <svg
              viewBox="0 0 24 24"
              width={18}
              height={18}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path d="M5.6 5.6A7 7 0 0 1 12 3.5V12l5.6 5.6A7 7 0 1 1 5.6 5.6Z" />
            </svg>
          }
        />
      </section>

      <section className="grid gap-3 sm:gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <Card className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              Daily spending
            </p>
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
              {monthLabel} by day
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {daily.length === 0
                ? "No spending activity this month yet."
                : `${daily.length} active day${daily.length === 1 ? "" : "s"}.`}
            </p>
          </div>
          {daily.length === 0 ? (
            <EmptyState
              compact
              eyebrow="No data"
              title="Nothing charted yet."
              description="Daily totals will appear as bars once expenses are added this month."
            />
          ) : (
            <div className="h-52 w-full sm:h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={daily}
                  margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
                >
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    className="text-[var(--color-muted-foreground)]"
                    tickFormatter={(value) =>
                      typeof value === "string" ? value.slice(8) : String(value)
                    }
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    className="text-[var(--color-muted-foreground)]"
                    tickFormatter={(value) => {
                      const raw = typeof value === "number" ? value : Number(value);
                      const v = Number.isFinite(raw) ? raw : 0;
                      if (v >= 1000) {
                        const scaled = v / 1000;
                        const base = formatCurrency(scaled);
                        return `${base}k`;
                      }
                      return formatCurrency(Math.round(v));
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-surface-subtle)" }}
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "14px",
                      color: "var(--color-foreground)",
                      fontSize: 12,
                    }}
                    labelFormatter={(label) => `Date: ${label ?? ""}`}
                    formatter={(value) => {
                      const v = typeof value === "number" ? value : Number(value);
                      return [formatCurrency(Number.isFinite(v) ? v : 0), "Spent"];
                    }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="var(--color-accent)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              By category
            </p>
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
              Where {monthLabel} went
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {categoryBreakdown.length === 0
                ? "No category splits yet."
                : `${categoryBreakdown.length} top categor${categoryBreakdown.length === 1 ? "y" : "ies"}.`}
            </p>
          </div>
          {categoryBreakdown.length === 0 ? (
            <EmptyState
              compact
              eyebrow="No data"
              title="Categories appear here."
              description="Add an expense with a category to see the breakdown."
            />
          ) : (
            <div className="grid gap-4 items-center sm:grid-cols-[1fr_1.05fr]">
              <div className="h-44 w-full sm:h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="total"
                      nameKey="label"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      stroke="var(--color-surface)"
                      strokeWidth={3}
                    >
                      {categoryBreakdown.map((entry, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={resolveHexFill(entry.category.colorToken)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "14px",
                        color: "var(--color-foreground)",
                        fontSize: 12,
                      }}
                      formatter={(value, name) => {
                        const v = typeof value === "number" ? value : Number(value);
                        const n = typeof name === "string" ? name : String(name);
                        return [formatCurrency(Number.isFinite(v) ? v : 0), n];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-sm">
                {categoryBreakdown.map((entry) => {
                  const color = resolveCategoryColor(entry.category.colorToken);
                  return (
                    <li
                      key={entry.category.id}
                      className="flex items-center justify-between gap-3 py-1"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 shrink-0 rounded-full",
                            color.dot,
                          )}
                          aria-hidden
                        />
                        <span className="truncate text-[var(--color-foreground)]">
                          {entry.label}
                        </span>
                      </span>
                      <span className="tabular-nums text-[var(--color-muted-foreground)]">
                        {formatCurrency(entry.total)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-3 sm:gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        {showEmptyMonth ? (
          <Card className="px-4 py-4 sm:px-5 sm:py-5 space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              This month
            </p>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-foreground)] sm:text-xl">
              No expenses for {monthLabel} yet.
            </h2>
            <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
              You have {expenses.length} expense{expenses.length === 1 ? "" : "s"} saved
              from earlier months. Select a past month or add new entries to see activity.
            </p>
          </Card>
        ) : (
          <ExpenseList
            limit={5}
            showActions
            emptyEyebrow="Capture flow"
            emptyTitle="No expenses yet."
            emptyDescription="Add your first expense. Totals update immediately across the dashboard."
            header={
              hasExpensesAnyMonth ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
                      Recent expenses
                    </p>
                    <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)]">
                      Newest entries first, across all months.
                    </p>
                  </div>
                  <Link
                    href="/expenses"
                    className="inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-subtle)]"
                  >
                    View all
                  </Link>
                </div>
              ) : undefined
            }
          />
        )}

        <Card className="px-4 py-4 sm:px-5 sm:py-5 space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              Overview
            </p>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
              Real-time calculations.
            </h2>
            <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
              Use the primary Add Expense action in the header on desktop or the floating action button on mobile. Totals update everywhere instantly.
            </p>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase mb-3">
              Categories
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.slice(0, 10).map((cat) => (
                <CategoryBadge key={cat.id} category={cat} size="sm" />
              ))}
              {categories.length > 10 ? (
                <span className="rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-subtle)] px-3 py-1.5 text-xs text-[var(--color-muted-foreground)]">
                  +{categories.length - 10} more
                </span>
              ) : null}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
