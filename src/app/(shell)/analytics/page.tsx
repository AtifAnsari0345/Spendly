"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useSpendly } from "@/app/spendly-provider";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { CategoryBadge } from "@/components/ui/category-badge";
import { resolveCategoryColor } from "@/features/categories/ui/category-visuals";

import { cn } from "@/lib/cn";
import { formatHumanDate } from "@/lib/format/date";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import type { Expense } from "@/features/expenses/models/expense";

import {
  calculateAverageDailySpend,
  calculateCategoryRankings,
  calculateExpenseCount,
  calculateMonthlyComparison,
  calculateTotalExpenses,
  categoryChange,
  dailyTotals,
  elapsedDaysInRange,
  findLargestExpense,
  findTopExpenses,
  formatMonthLabel,
  getCurrentMonthYear,
  monthBoundsIso,
  monthlyTotals,
  previousMonthExpenses,
} from "@/lib/analytics/expense-metrics";

type PeriodId =
  | "this-month"
  | "last-month"
  | "this-year"
  | "all-time"
  | "custom";

type Granularity = "daily" | "monthly";

const MONTH_LONG_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function selectPeriodExpenses(
  expenses: Expense[],
  period: PeriodId,
  customFrom: string,
  customTo: string,
): {
  expenses: Expense[];
  previousExpenses: Expense[];
  label: string;
  fromIso: string;
  toIso: string;
} {
  const { year, month } = getCurrentMonthYear();

  if (period === "this-month") {
    const curr = expenses.filter((e) =>
      e.date.startsWith(`${year}-${String(month).padStart(2, "0")}`),
    );
    const prev = previousMonthExpenses(expenses, year, month);
    const bounds = monthBoundsIso(year, month);
    return {
      expenses: curr,
      previousExpenses: prev,
      label: formatMonthLabel(year, month),
      fromIso: bounds.from,
      toIso: bounds.to,
    };
  }

  if (period === "last-month") {
    const prev = previousMonthExpenses(expenses, year, month);
    const lastDate = new Date(year, month - 2, 1);
    const lastYear = lastDate.getFullYear();
    const lastMonth = lastDate.getMonth() + 1;
    const prevOfPrev = previousMonthExpenses(expenses, lastYear, lastMonth);
    const bounds = monthBoundsIso(lastYear, lastMonth);
    return {
      expenses: prev,
      previousExpenses: prevOfPrev,
      label: formatMonthLabel(lastYear, lastMonth),
      fromIso: bounds.from,
      toIso: bounds.to,
    };
  }

  if (period === "this-year") {
    const prefix = `${year}-`;
    const curr = expenses.filter((e) => e.date.startsWith(prefix));
    const prevYear = `${year - 1}-`;
    const prev = expenses.filter((e) => e.date.startsWith(prevYear));
    return {
      expenses: curr,
      previousExpenses: prev,
      label: `${year}`,
      fromIso: `${year}-01-01`,
      toIso: `${year}-12-31`,
    };
  }

  if (period === "all-time") {
    let earliest = "";
    for (const expense of expenses) {
      if (!earliest || expense.date < earliest) {
        earliest = expense.date;
      }
    }
    return {
      expenses: expenses.slice(),
      previousExpenses: [],
      label: "All time",
      fromIso: earliest,
      toIso: todayIso(),
    };
  }

  const fromIso = customFrom;
  const toIso = customTo || todayIso();
  const curr = expenses.filter((e) => e.date >= fromIso && e.date <= toIso);
  const fromDate = new Date(fromIso);
  const toDate = new Date(toIso);
  const days = Math.max(
    1,
    Math.round((toDate.valueOf() - fromDate.valueOf()) / 86_400_000) + 1,
  );
  const prevTo = new Date(fromDate.valueOf() - 86_400_000);
  const prevFrom = new Date(prevTo.valueOf() - (days - 1) * 86_400_000);
  const prevFromIso = `${prevFrom.getFullYear()}-${String(prevFrom.getMonth() + 1).padStart(2, "0")}-${String(prevFrom.getDate()).padStart(2, "0")}`;
  const prevToIso = `${prevTo.getFullYear()}-${String(prevTo.getMonth() + 1).padStart(2, "0")}-${String(prevTo.getDate()).padStart(2, "0")}`;
  const prev = expenses.filter((e) => e.date >= prevFromIso && e.date <= prevToIso);

  let label = "Custom";
  if (fromIso) {
    const [fy, fm, fd] = fromIso.split("-").map((v) => Number(v));
    label = `${MONTH_LONG_NAMES[fm - 1].slice(0, 3)} ${fd}, ${fy}`;
    if (toIso) {
      const [ty, tm, td] = toIso.split("-").map((v) => Number(v));
      label += " → " + `${MONTH_LONG_NAMES[tm - 1].slice(0, 3)} ${td}, ${ty}`;
    }
  }
  return { expenses: curr, previousExpenses: prev, label, fromIso, toIso };
}

const dateInputBaseClass =
  "h-9 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)] transition-colors hover:border-[var(--color-accent)]/60 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:[color-scheme:dark]";

export default function AnalyticsPage() {
  const { expenses, categories } = useSpendly();
  const { format: formatCurrency } = useFormatCurrency();

  const [period, setPeriod] = useState<PeriodId>("this-month");
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [customTo, setCustomTo] = useState<string>(todayIso());

  const selected = useMemo(
    () => selectPeriodExpenses(expenses, period, customFrom, customTo),
    [expenses, period, customFrom, customTo],
  );

  const periodExpenses = selected.expenses;
  const priorPeriodExpenses = selected.previousExpenses;
  const periodLabel = selected.label;
  const periodFromIso = selected.fromIso;
  const periodToIso = selected.toIso;

  const summary = useMemo(() => {
    const total = calculateTotalExpenses(periodExpenses);
    const count = calculateExpenseCount(periodExpenses);
    const days = elapsedDaysInRange(periodFromIso, periodToIso);
    const avgDaily = calculateAverageDailySpend(periodExpenses, days);
    const largest = findLargestExpense(periodExpenses);
    const mom = calculateMonthlyComparison(periodExpenses, priorPeriodExpenses);
    return { total, count, avgDaily, largest, mom, days };
  }, [periodExpenses, priorPeriodExpenses, periodFromIso, periodToIso]);

  const chartPoints = useMemo(() => {
    if (periodExpenses.length === 0) return [];
    if (granularity === "monthly") {
      return monthlyTotals(periodExpenses).map((m) => ({
        label: `${m.year}-${String(m.monthOneIndexed).padStart(2, "0")}`,
        display: `${MONTH_LONG_NAMES[m.monthOneIndexed - 1].slice(0, 3)} ${String(m.year).slice(2)}`,
        total: m.total,
      }));
    }
    if (period === "this-year") {
      return monthlyTotals(periodExpenses).map((m) => ({
        label: `${m.year}-${String(m.monthOneIndexed).padStart(2, "0")}`,
        display: MONTH_LONG_NAMES[m.monthOneIndexed - 1].slice(0, 3),
        total: m.total,
      }));
    }
    if (period === "all-time" && periodExpenses.length >= 60) {
      return monthlyTotals(periodExpenses, { limit: 24 }).map((m) => ({
        label: `${m.year}-${String(m.monthOneIndexed).padStart(2, "0")}`,
        display: `${MONTH_LONG_NAMES[m.monthOneIndexed - 1].slice(0, 3)} ${String(m.year).slice(2)}`,
        total: m.total,
      }));
    }
    return dailyTotals(periodExpenses).map((d) => ({
      label: d.date,
      display: d.date.slice(5),
      total: d.total,
    }));
  }, [periodExpenses, granularity, period]);

  const rankings = useMemo(
    () => calculateCategoryRankings(periodExpenses, categories),
    [periodExpenses, categories],
  );

  const topExpenses = useMemo(
    () => findTopExpenses(periodExpenses, 10),
    [periodExpenses],
  );

  const categoryTrends = useMemo(
    () => categoryChange(priorPeriodExpenses, periodExpenses, categories),
    [periodExpenses, priorPeriodExpenses, categories],
  );

  const hasAnyExpenses = expenses.length > 0;
  const hasPeriodData = periodExpenses.length > 0;

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageIntro
        eyebrow="Analytics"
        title="Understand where your money goes."
        description="Spot trends, rank categories, and compare periods using numbers computed directly from your expense list."
      />

      <Card className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              Period
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {(
                [
                  ["this-month", "This month"],
                  ["last-month", "Last month"],
                  ["this-year", "This year"],
                  ["all-time", "All time"],
                  ["custom", "Custom"],
                ] as [PeriodId, string][]
              ).map(([id, label]) => {
                const active = period === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPeriod(id)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors sm:h-9 sm:px-3.5 sm:text-sm",
                      active
                        ? "border-transparent bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-soft"
                        : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-subtle)] hover:border-[var(--color-accent)]/40 focus-visible:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/20",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {period === "custom" ? (
            <div className="flex flex-wrap items-end gap-2 sm:gap-3">
              <div className="flex flex-col gap-1 text-xs text-[var(--color-muted-foreground)]">
                <label htmlFor="analytics-custom-from" className="font-medium">
                  From
                </label>
                <input
                  id="analytics-custom-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  max={customTo || undefined}
                  className={dateInputBaseClass}
                />
              </div>
              <div className="flex flex-col gap-1 text-xs text-[var(--color-muted-foreground)]">
                <label htmlFor="analytics-custom-to" className="font-medium">
                  To
                </label>
                <input
                  id="analytics-custom-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  min={customFrom || undefined}
                  max={todayIso()}
                  className={dateInputBaseClass}
                />
              </div>
              <Link href="/expenses">
                <Button variant="secondary" className="h-9 px-3 text-xs">
                  Browse expenses
                </Button>
              </Link>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm">
          <span className="font-medium text-[var(--color-foreground)]">
            {selected.label}
          </span>
          <span className="mx-2 text-[var(--color-border-strong)]">·</span>
          <span className="text-[var(--color-muted-foreground)]">
            {periodExpenses.length === 0
              ? "No expenses in this range."
              : `${periodExpenses.length} ${periodExpenses.length === 1 ? "entry" : "entries"} across ${rankings.length} categor${rankings.length === 1 ? "y" : "ies"}.`}
          </span>
        </div>
      </Card>

      <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total spent"
          value={formatCurrency(summary.total)}
          hint={
            <div className="space-y-1">
              <div>
                {summary.count} {summary.count === 1 ? "expense" : "expenses"} ·{" "}
                {selected.label}
              </div>
              {periodExpenses.length > 0 &&
              (summary.mom.deltaPct !== null ||
                Math.abs(summary.mom.delta) > 0.0001) ? (
                <div
                  className={cn(
                    "inline-flex items-center gap-1 font-medium",
                    summary.mom.direction === "up"
                      ? "text-rose-600 dark:text-rose-400"
                      : summary.mom.direction === "down"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-[var(--color-muted-foreground)]",
                  )}
                >
                  {summary.mom.direction === "up"
                    ? "▲"
                    : summary.mom.direction === "down"
                      ? "▼"
                      : "■"}
                  {summary.mom.deltaPct !== null
                    ? ` ${Math.abs(summary.mom.deltaPct)}% vs previous period`
                    : ` ${formatCurrency(Math.abs(summary.mom.delta))} vs previous period`}
                </div>
              ) : periodExpenses.length > 0 ? (
                <div className="text-[var(--color-muted-foreground)]">
                  No prior comparable period data.
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
          value={String(summary.count)}
          hint={
            summary.count === 0
              ? "No entries in the selected period."
              : summary.days > 1
                ? `Across ${summary.days} calendar days in range.`
                : "Based on the selected range."
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
          value={formatCurrency(summary.avgDaily)}
          hint={
            summary.count === 0
              ? "No data to average yet."
              : period === "all-time"
                ? `${summary.days} calendar day${summary.days === 1 ? "" : "s"} since your first expense.`
                : `${summary.days} calendar day${summary.days === 1 ? "" : "s"} in ${periodLabel}.`
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
          label="Largest expense"
          value={
            summary.largest ? (
              <span className="text-xl sm:text-2xl">
                {formatCurrency(summary.largest.amount)}
              </span>
            ) : (
              <span className="text-[var(--color-muted-foreground)]">—</span>
            )
          }
          hint={
            summary.largest ? (
              <div className="space-y-0.5">
                <div className="line-clamp-1 [overflow-wrap:anywhere] text-[var(--color-foreground)]">
                  {summary.largest.title}
                </div>
                <div className="text-[var(--color-muted-foreground)]">
                  {formatHumanDate(summary.largest.date)}
                </div>
              </div>
            ) : (
              "Your single biggest item appears here."
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
              <path d="M3 17.5 9 11.5 13 15.5 21 7.5" />
              <path d="M14.5 7.5H21v6.5" />
            </svg>
          }
        />
      </section>

      <section className="grid gap-3 sm:gap-4 lg:grid-cols-[1.5fr_0.85fr]">
        <Card className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
                Spending over time
              </p>
              <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
                {selected.label} trend
              </h2>
              <p className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
                {hasPeriodData
                  ? `${chartPoints.length} data point${chartPoints.length === 1 ? "" : "s"}.`
                  : "Nothing to plot yet."}
              </p>
            </div>
            <div className="inline-flex rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-0.5 text-xs">
              {(["daily", "monthly"] as Granularity[]).map((g) => {
                const active = granularity === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGranularity(g)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex h-7 items-center rounded-full px-3 font-medium capitalize transition-colors",
                      active
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-foreground)] ring-1 ring-[var(--color-accent)]/20"
                        : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                    )}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {!hasPeriodData ? (
            <EmptyState
              compact
              eyebrow="No data"
              title="No activity in this period."
              description="Switch periods or add expenses to see the distribution over time."
              action={
                <Button
                  variant="secondary"
                  onClick={() => setPeriod("all-time")}
                >
                  View all time
                </Button>
              }
            />
          ) : (
            <div className="h-56 w-full sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartPoints}
                  margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
                >
                  <defs>
                    <linearGradient
                      id="areaSpending"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-accent)"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-accent)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    className="text-[var(--color-muted-foreground)]"
                    tickFormatter={(value) => {
                      const label =
                        typeof value === "string" ? value : String(value);
                      const found = chartPoints.find((p) => p.label === label);
                      if (found?.display) return found.display;
                      return label.length > 5 ? label.slice(5) : label;
                    }}
                    interval="preserveStartEnd"
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
                        const base = formatCurrency(v / 1000);
                        return `${base}k`;
                      }
                      return formatCurrency(Math.round(v));
                    }}
                  />
                  <Tooltip
                    cursor={{
                      stroke: "var(--color-border)",
                      strokeDasharray: "4 4",
                    }}
                    contentStyle={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "14px",
                      color: "var(--color-foreground)",
                      fontSize: 12,
                    }}
                    labelFormatter={(_label, items) => {
                      const arr =
                        (items as unknown as {
                          payload?: { display?: string; label?: string };
                        }[]) ?? [];
                      const rawLabel =
                        typeof _label === "string" || typeof _label === "number"
                          ? String(_label)
                          : "";
                      return (
                        arr?.[0]?.payload?.display ??
                        arr?.[0]?.payload?.label ??
                        rawLabel
                      );
                    }}
                    formatter={(value) => {
                      const v = typeof value === "number" ? value : Number(value);
                      return [formatCurrency(Number.isFinite(v) ? v : 0), "Spent"];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    fill="url(#areaSpending)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              Category rankings
            </p>
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
              Highest to lowest
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {rankings.length === 0
                ? "No categories in the selected period."
                : `${rankings.length} categor${rankings.length === 1 ? "y" : "ies"} ranked by total.`}
            </p>
          </div>

          {rankings.length === 0 ? (
            <EmptyState
              compact
              eyebrow="Empty"
              title="Rankings appear here."
              description="Add expenses across categories to see which ones drive your total."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {rankings.map((row) => (
                <li
                  key={row.category.id}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-xs font-semibold text-[var(--color-muted-foreground)] ring-1 ring-[var(--color-border)]">
                    {row.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-[var(--color-foreground)]">
                        {row.category.name}
                      </span>
                      {row.share !== null ? (
                        <span className="rounded-full bg-[var(--color-surface-subtle)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--color-muted-foreground)]">
                          {row.share}%
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--color-surface-subtle)]">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          resolveCategoryColor(row.category.colorToken).bg,
                        )}
                        style={{ width: `${Math.min(100, row.share ?? 0)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-[var(--color-muted-foreground)]">
                      <span>
                        {row.count} {row.count === 1 ? "expense" : "expenses"}
                      </span>
                      <span className="tabular-nums">
                        {formatCurrency(row.total)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="grid gap-3 sm:gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              Top expenses
            </p>
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
              Biggest single items
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {topExpenses.length === 0
                ? "No expenses yet in this period."
                : `Your top ${topExpenses.length === 1 ? "expense" : `${topExpenses.length} expenses`} by amount.`}
            </p>
          </div>

          {topExpenses.length === 0 ? (
            <EmptyState
              compact
              eyebrow="Empty"
              title="No entries to rank yet."
              description="Once you add expenses, the largest items surface here first."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {topExpenses.map((exp, idx) => {
                const cat = categories.find((c) => c.id === exp.categoryId);
                return (
                  <li
                    key={exp.id}
                    className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-[var(--color-muted-foreground)] ring-1 ring-[var(--color-border)]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 space-y-1">
                        <p className="line-clamp-1 [overflow-wrap:anywhere] text-sm font-medium text-[var(--color-foreground)]">
                          {exp.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-muted-foreground)]">
                          <span>{formatHumanDate(exp.date)}</span>
                          {cat ? (
                            <CategoryBadge category={cat} size="sm" />
                          ) : null}
                        </div>
                        {exp.note ? (
                          <p className="line-clamp-1 [overflow-wrap:anywhere] text-xs text-[var(--color-muted-foreground)]">
                            {exp.note}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                      {formatCurrency(exp.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              Category trends
            </p>
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
              Versus previous period
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {categoryTrends.length === 0
                ? "No comparable category changes yet."
                : `Change across ${categoryTrends.length} categor${categoryTrends.length === 1 ? "y" : "ies"}.`}
            </p>
          </div>

          {!hasAnyExpenses ? (
            <EmptyState
              compact
              eyebrow="No data"
              title="Trends need two periods of data."
              description="Once you have expenses in both this period and a comparable prior one, each category's movement shows here."
            />
          ) : categoryTrends.length === 0 ? (
            <EmptyState
              compact
              eyebrow="No movement"
              title="No changes versus prior period."
              description="Try expanding the range to capture more historical data."
              action={
                <Button
                  variant="secondary"
                  onClick={() => setPeriod("all-time")}
                >
                  Expand to all time
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {categoryTrends.map((row) => {
                const cat =
                  categories.find((c) => c.id === row.category.id) ??
                  row.category;
                const color = resolveCategoryColor(row.category.colorToken);
                return (
                  <li
                    key={row.category.id}
                    className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          color.dot,
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                          {cat.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-muted-foreground)]">
                          <span className="tabular-nums">
                            {formatCurrency(row.fromTotal)} →{" "}
                            {formatCurrency(row.toTotal)}
                          </span>
                          {row.share !== null ? (
                            <span className="rounded-full bg-[var(--color-surface-subtle)] px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                              {row.share}%
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        row.direction === "up"
                          ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/25"
                          : row.direction === "down"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25"
                            : "bg-[var(--color-surface-subtle)] text-[var(--color-muted-foreground)] ring-1 ring-[var(--color-border)]",
                      )}
                    >
                      {row.direction === "up"
                        ? "▲"
                        : row.direction === "down"
                          ? "▼"
                          : "■"}
                      {row.deltaPct !== null
                        ? ` ${Math.abs(row.deltaPct)}%`
                        : ` ${formatCurrency(Math.abs(row.delta))}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
