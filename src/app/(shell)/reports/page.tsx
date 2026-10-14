"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/form-fields";
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
  calculateCategoryTotals,
  calculateExpenseCount,
  calculateMonthlyComparison,
  calculateTotalExpenses,
  categoryChange,
  elapsedDaysInMonth,
  elapsedDaysInRange,
  findLargestExpense,
  findTopExpenses,
  formatMonthLabel,
  getCurrentMonthYear,
  monthlyTotals,
  previousMonthExpenses,
} from "@/lib/analytics/expense-metrics";

import {
  exportExpensesToExcel,
  filterExpensesForRange,
  type ExportProgressStatus,
  type ExportRange,
} from "@/lib/export/to-excel";

type ReportView = "monthly" | "yearly";

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

const MAX_DONUT_CATEGORIES = 6;

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

function pad2(v: number): string {
  return String(v).padStart(2, "0");
}

function yearsInExpenses(expenses: Expense[]): number[] {
  const set = new Set<number>();
  for (const e of expenses) {
    const y = Number(e.date.slice(0, 4));
    if (Number.isFinite(y) && y > 2000 && y < 2200) set.add(y);
  }
  return [...set].sort((a, b) => b - a);
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

const dateInputBaseClass =
  "h-9 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)] transition-colors hover:border-[var(--color-accent)]/60 focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 dark:[color-scheme:dark]";

const selectEnhancedClass =
  "transition-colors hover:border-[var(--color-accent)]/60 dark:[color-scheme:dark]";

function availableYearOptions(
  customYears: number[],
  currentYear: number,
): number[] {
  const set = new Set<number>(customYears);
  set.add(currentYear);
  set.add(currentYear - 1);
  set.add(currentYear - 2);
  return [...set].sort((a, b) => b - a);
}

function monthSelectLabel(m: number): string {
  return MONTH_LONG_NAMES[m - 1];
}

function SelectChevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function ReportsPage() {
  const { expenses, categories, pushToast } = useSpendly();
  const { format: formatCurrency } = useFormatCurrency();
  const { year: currentYear, month: currentMonth } = getCurrentMonthYear();

  const [view, setView] = useState<ReportView>("monthly");
  const [monthSel, setMonthSel] = useState<number>(currentMonth);
  const [yearSel, setYearSel] = useState<number>(currentYear);
  const [yearlySel, setYearlySel] = useState<number>(currentYear);

  const [exportRange, setExportRange] = useState<ExportRange>({
    kind: "this-month",
  });
  const [exportCustomFrom, setExportCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  });
  const [exportCustomTo, setExportCustomTo] = useState<string>(todayIso());
  const [exportStatus, setExportStatus] = useState<ExportProgressStatus>({
    state: "idle",
  });
  const [exportCooldown, setExportCooldown] = useState(false);

  const reportExpenses = useMemo(() => {
    if (view === "monthly") {
      const prefix = `${yearSel}-${pad2(monthSel)}-`;
      return expenses.filter((e) => e.date.startsWith(prefix));
    }
    const prefix = `${yearlySel}-`;
    return expenses.filter((e) => e.date.startsWith(prefix));
  }, [expenses, view, monthSel, yearSel, yearlySel]);

  const priorReportExpenses = useMemo(() => {
    if (view === "monthly") {
      return previousMonthExpenses(expenses, yearSel, monthSel);
    }
    const prior = `${yearlySel - 1}-`;
    return expenses.filter((e) => e.date.startsWith(prior));
  }, [expenses, view, monthSel, yearSel, yearlySel]);

  const reportLabel =
    view === "monthly"
      ? formatMonthLabel(yearSel, monthSel)
      : String(yearlySel);

  const totals = useMemo(() => {
    const total = calculateTotalExpenses(reportExpenses);
    const count = calculateExpenseCount(reportExpenses);
    const days =
      view === "monthly"
        ? elapsedDaysInMonth(yearSel, monthSel)
        : elapsedDaysInRange(`${yearlySel}-01-01`, `${yearlySel}-12-31`);
    const avgDaily = calculateAverageDailySpend(reportExpenses, days);
    const top = calculateCategoryTotals(reportExpenses, categories).sort(
      (a, b) => b.total - a.total,
    )[0];
    const largest = findLargestExpense(reportExpenses);
    const mom = calculateMonthlyComparison(reportExpenses, priorReportExpenses);
    return { total, count, avgDaily, top, largest, mom, days };
  }, [
    reportExpenses,
    priorReportExpenses,
    categories,
    view,
    monthSel,
    yearSel,
    yearlySel,
  ]);

  const categoryRankings = useMemo(
    () => calculateCategoryRankings(reportExpenses, categories),
    [reportExpenses, categories],
  );

  const topDonut = useMemo(() => {
    const entries = calculateCategoryTotals(reportExpenses, categories);
    const topResults = entries.slice(0, MAX_DONUT_CATEGORIES).map((e) => ({
      ...e,
      label: e.category.name,
    }));
    if (entries.length > MAX_DONUT_CATEGORIES) {
      const rest = entries.slice(MAX_DONUT_CATEGORIES);
      const restTotal = rest.reduce((sum, e) => sum + e.total, 0);
      if (restTotal > 0.0001) {
        const iso = new Date().toISOString();
        topResults.push({
          category: {
            id: "reports-other",
            name: "Other categories",
            slug: "other",
            icon: "dots",
            colorToken: "slate",
            createdAt: iso,
            updatedAt: iso,
          },
          total: Math.round(restTotal * 100) / 100,
          count: rest.reduce((n, e) => n + e.count, 0),
          label: "Other categories",
        });
      }
    }
    return topResults;
  }, [reportExpenses, categories]);

  const monthlySpendingChart = useMemo(() => {
    if (view === "monthly") {
      return monthlyTotals(reportExpenses, {
        minMonth: `${yearSel}-${pad2(monthSel)}`,
        maxMonth: `${yearSel}-${pad2(monthSel)}`,
      }).map((m) => ({
        label: `${m.year}-${pad2(m.monthOneIndexed)}`,
        display: `${MONTH_LONG_NAMES[m.monthOneIndexed - 1].slice(0, 3)} ${String(m.year).slice(2)}`,
        total: m.total,
      }));
    }
    return monthlyTotals(reportExpenses, {
      minMonth: `${yearlySel}-01`,
      maxMonth: `${yearlySel}-12`,
    }).map((m) => ({
      label: `${m.year}-${pad2(m.monthOneIndexed)}`,
      display: MONTH_LONG_NAMES[m.monthOneIndexed - 1].slice(0, 3),
      total: m.total,
    }));
  }, [reportExpenses, view, yearSel, monthSel, yearlySel]);

  const categoryTrends = useMemo(
    () => categoryChange(priorReportExpenses, reportExpenses, categories),
    [reportExpenses, priorReportExpenses, categories],
  );

  const topExpenses = useMemo(
    () => findTopExpenses(reportExpenses, 8),
    [reportExpenses],
  );

  const availableYears = useMemo(
    () => availableYearOptions(yearsInExpenses(expenses), currentYear),
    [expenses, currentYear],
  );

  const hasData = reportExpenses.length > 0;

  const resolveEffectiveExportRange = (): ExportRange => {
    if (exportRange.kind !== "custom") return exportRange;
    const to = exportCustomTo || todayIso();
    return { kind: "custom", fromIso: exportCustomFrom, toIso: to };
  };

  const handleExport = async () => {
    if (exportCooldown) return;
    if (exportStatus.state === "loading") return;

    const eff = resolveEffectiveExportRange();
    if (eff.kind === "custom") {
      if (eff.fromIso > eff.toIso) {
        const err: ExportProgressStatus = {
          state: "error",
          message: "From date must be on or before To date.",
        };
        setExportStatus(err);
        pushToast({
          kind: "error",
          title: "Invalid dates",
          description: err.message,
        });
        return;
      }
    }
    const preview = filterExpensesForRange(expenses, eff);
    if (preview.filtered.length === 0) {
      const err: ExportProgressStatus = {
        state: "error",
        message:
          "No expenses fall within this range. Pick a different range or add expenses first.",
      };
      setExportStatus(err);
      pushToast({
        kind: "error",
        title: "Nothing to export",
        description: err.message,
      });
      return;
    }

    setExportCooldown(true);
    setExportStatus({ state: "loading", message: "Preparing workbook…" });

    const result = await exportExpensesToExcel({
      expenses,
      categories,
      range: eff,
    });
    setExportStatus(result);

    if (result.state === "success") {
      pushToast({
        kind: "success",
        title: "Export ready",
        description: result.message,
      });
    } else if (result.state === "error") {
      pushToast({
        kind: "error",
        title: "Export failed",
        description: result.message,
      });
    }

    setTimeout(() => setExportCooldown(false), 1600);
  };

  const status = exportStatus;

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageIntro
        eyebrow="Reports"
        title="Summaries you can share and save."
        description="Monthly and yearly reports compute from the same validated expense data as the dashboard and analytics."
      />

      <Card className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              Report view
            </p>
            <div className="inline-flex rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-0.5 text-xs sm:text-sm">
              {([
                ["monthly", "Monthly"],
                ["yearly", "Yearly"],
              ] as [ReportView, string][]).map(([id, label]) => {
                const active = view === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex h-8 items-center rounded-full px-3.5 font-medium transition-colors sm:h-9 sm:px-4",
                      active
                        ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-soft"
                        : "text-[var(--color-foreground)] hover:bg-[var(--color-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/20",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2 sm:gap-3">
            {view === "monthly" ? (
              <>
                <div className="flex flex-col gap-1 text-xs text-[var(--color-muted-foreground)]">
                  <label htmlFor="reports-month" className="font-medium">
                    Month
                  </label>
                  <div className="relative">
                    <Select
                      id="reports-month"
                      value={monthSel}
                      onChange={(e) => setMonthSel(Number(e.target.value))}
                      className={selectEnhancedClass}
                    >
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const m = idx + 1;
                        return (
                          <option key={m} value={m}>
                            {monthSelectLabel(m)}
                          </option>
                        );
                      })}
                    </Select>
                    <SelectChevron />
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-xs text-[var(--color-muted-foreground)]">
                  <label htmlFor="reports-year" className="font-medium">
                    Year
                  </label>
                  <div className="relative">
                    <Select
                      id="reports-year"
                      value={yearSel}
                      onChange={(e) => setYearSel(Number(e.target.value))}
                      className={selectEnhancedClass}
                    >
                      {availableYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </Select>
                    <SelectChevron />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1 text-xs text-[var(--color-muted-foreground)]">
                <label htmlFor="reports-yearly" className="font-medium">
                  Year
                </label>
                <div className="relative">
                  <Select
                    id="reports-yearly"
                    value={yearlySel}
                    onChange={(e) => setYearlySel(Number(e.target.value))}
                    className={selectEnhancedClass}
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Select>
                  <SelectChevron />
                </div>
              </div>
            )}
            <Link href="/expenses">
              <Button variant="secondary" className="h-9 px-3 text-xs">
                Browse expenses
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm">
          <span className="font-medium text-[var(--color-foreground)]">
            {reportLabel}
          </span>
          <span className="mx-2 text-[var(--color-border-strong)]">·</span>
          <span className="text-[var(--color-muted-foreground)]">
            {hasData
              ? `${reportExpenses.length} entr${reportExpenses.length === 1 ? "y" : "ies"} across ${categoryRankings.length} categor${categoryRankings.length === 1 ? "y" : "ies"}`
              : "No expenses in the selected period."}
          </span>
        </div>
      </Card>

      <section className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={view === "monthly" ? "Monthly total" : "Yearly total"}
          value={formatCurrency(totals.total)}
          hint={
            <div className="space-y-1">
              <div>
                {totals.count} {totals.count === 1 ? "expense" : "expenses"} in {reportLabel}
              </div>
              {hasData &&
              (totals.mom.deltaPct !== null ||
                Math.abs(totals.mom.delta) > 0.0001) ? (
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
                  {totals.mom.deltaPct !== null
                    ? ` ${Math.abs(totals.mom.deltaPct)}% vs ${view === "monthly" ? formatMonthLabel(monthSel === 1 ? yearSel - 1 : yearSel, monthSel === 1 ? 12 : monthSel - 1) : yearlySel - 1}`
                    : ` ${formatCurrency(Math.abs(totals.mom.delta))} vs ${view === "monthly" ? formatMonthLabel(monthSel === 1 ? yearSel - 1 : yearSel, monthSel === 1 ? 12 : monthSel - 1) : yearlySel - 1}`}
                </div>
              ) : hasData ? (
                <div className="text-[var(--color-muted-foreground)]">
                  No comparable prior-period data.
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
          label="Entries"
          value={String(totals.count)}
          hint={
            totals.count === 0
              ? "Select a different period or add an expense."
              : `Across ${totals.days} calendar day${totals.days === 1 ? "" : "s"} in ${reportLabel}.`
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
              ? "No activity to average."
              : `${totals.days} calendar day${totals.days === 1 ? "" : "s"} in ${reportLabel}.`
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
          label="Largest"
          value={
            totals.largest ? (
              <span className="text-xl sm:text-2xl">
                {formatCurrency(totals.largest.amount)}
              </span>
            ) : (
              <span className="text-[var(--color-muted-foreground)]">—</span>
            )
          }
          hint={
            totals.largest ? (
              <div className="space-y-0.5">
                <div className="line-clamp-1 [overflow-wrap:anywhere] text-[var(--color-foreground)]">
                  {totals.largest.title}
                </div>
                <div className="text-[var(--color-muted-foreground)]">
                  {formatHumanDate(totals.largest.date)}
                </div>
              </div>
            ) : (
              "The largest single item appears here."
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

      <section className="grid gap-3 sm:gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              {view === "monthly" ? "Month overview" : "Year overview"}
            </p>
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
              {reportLabel} distribution
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {monthlySpendingChart.filter((p) => p.total > 0).length === 0
                ? "No spending in the selected period."
                : view === "monthly"
                  ? "Monthly totals for the period scope."
                  : "Per-month totals within the selected year."}
            </p>
          </div>
          {monthlySpendingChart.filter((p) => p.total > 0).length === 0 ? (
            <EmptyState
              compact
              eyebrow="No data"
              title="Nothing to chart."
              description="Change the reporting period or add expenses to populate the overview."
            />
          ) : (
            <div className="h-56 w-full sm:h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlySpendingChart}
                  margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                >
                  <defs>
                    <linearGradient id="reportArea" x1="0" y1="0" x2="0" y2="1">
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
                      const lbl =
                        typeof value === "string" ? value : String(value);
                      const found = monthlySpendingChart.find(
                        (p) => p.label === lbl,
                      );
                      return found?.display ?? (lbl.length > 5 ? lbl.slice(5) : lbl);
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width="auto"
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    className="text-[var(--color-muted-foreground)]"
                    tickFormatter={(value) => {
                      const raw =
                        typeof value === "number" ? value : Number(value);
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
                    labelFormatter={(_, items) => {
                      const arr =
                        (items as unknown as {
                          payload?: { display?: string; label?: string };
                        }[]) ?? [];
                      return arr[0]?.payload?.display ?? arr[0]?.payload?.label ?? "";
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
                    fill="url(#reportArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              Category mix
            </p>
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
              Top categories
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {topDonut.length === 0
                ? "No categories represented in this report."
                : `${topDonut.length} top categor${topDonut.length === 1 ? "y" : "ies"}.`}
            </p>
          </div>
          {topDonut.length === 0 ? (
            <EmptyState
              compact
              eyebrow="No data"
              title="Category mix is empty."
              description="Add expenses with categories to populate the donut."
            />
          ) : (
            <div className="grid gap-4 items-center sm:grid-cols-[1fr_1.1fr]">
              <div className="h-44 w-full sm:h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topDonut}
                      dataKey="total"
                      nameKey="label"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      stroke="var(--color-surface)"
                      strokeWidth={3}
                    >
                      {topDonut.map((entry, i) => (
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
                {topDonut.map((entry) => {
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

      <section className="grid gap-3 sm:gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              Rankings
            </p>
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
              Top categories in {reportLabel}
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {categoryRankings.length === 0
                ? "No categories to rank."
                : `Sorted by total; ${categoryRankings.length} categor${categoryRankings.length === 1 ? "y" : "ies"}.`}
            </p>
          </div>
          {categoryRankings.length === 0 ? (
            <EmptyState
              compact
              eyebrow="Empty"
              title="Nothing ranked yet."
              description="Add expenses to see how each category contributes to your total."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {categoryRankings.map((row) => (
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

        <Card className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              Versus prior period
            </p>
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
              Category movement
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {categoryTrends.length === 0
                ? "No comparable movement yet."
                : `Change across ${categoryTrends.length} categor${categoryTrends.length === 1 ? "y" : "ies"}.`}
            </p>
          </div>
          {expenses.length === 0 ? (
            <EmptyState
              compact
              eyebrow="No data"
              title="Trends need data in two periods."
              description="Add expenses across multiple comparable periods to surface category movement."
            />
          ) : categoryTrends.length === 0 ? (
            <EmptyState
              compact
              eyebrow="No movement"
              title="Nothing changed versus prior."
              description="Try a different reporting period to reveal changes."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {categoryTrends.map((row) => {
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
                          {row.category.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-muted-foreground)]">
                          <span className="tabular-nums">
                            {formatCurrency(row.fromTotal)} → {formatCurrency(row.toTotal)}
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

      <section className="grid gap-3 sm:gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--color-muted-foreground)] uppercase">
              Top expenses
            </p>
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
              Biggest items in {reportLabel}
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {topExpenses.length === 0
                ? "No expenses in this period."
                : `${topExpenses.length} largest entr${topExpenses.length === 1 ? "y" : "ies"} by amount.`}
            </p>
          </div>
          {topExpenses.length === 0 ? (
            <EmptyState
              compact
              eyebrow="Empty"
              title="No entries yet."
              description="Largest items surface here once you add expenses."
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
                          {cat ? <CategoryBadge category={cat} size="sm" /> : null}
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
              Export
            </p>
            <h2 className="text-base font-semibold tracking-tight text-[var(--color-foreground)] sm:text-lg">
              Download as .xlsx
            </h2>
            <p className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              Workbook includes Expenses, Category Totals, and Monthly Totals sheets.
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3 sm:p-4">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-[var(--color-foreground)]">
                Export range
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["this-month", "This month"],
                    ["last-month", "Last month"],
                    ["this-year", "This year"],
                    ["all-time", "All time"],
                    ["custom", "Custom"],
                  ] as [ExportRange["kind"], string][]
                ).map(([kind, label]) => {
                  const active = exportRange.kind === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() =>
                        setExportRange({ kind } as Extract<ExportRange, { kind: typeof kind }>)
                      }
                      aria-pressed={active}
                      className={cn(
                        "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors sm:h-8.5",
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

            {exportRange.kind === "custom" ? (
              <div className="flex flex-wrap items-end gap-2 sm:gap-3 pt-1">
                <div className="flex flex-col gap-1 text-xs text-[var(--color-muted-foreground)]">
                  <label htmlFor="reports-export-from" className="font-medium">
                    From
                  </label>
                  <input
                    id="reports-export-from"
                    type="date"
                    value={exportCustomFrom}
                    onChange={(e) => setExportCustomFrom(e.target.value)}
                    max={exportCustomTo || undefined}
                    className={dateInputBaseClass}
                  />
                </div>
                <div className="flex flex-col gap-1 text-xs text-[var(--color-muted-foreground)]">
                  <label htmlFor="reports-export-to" className="font-medium">
                    To
                  </label>
                  <input
                    id="reports-export-to"
                    type="date"
                    value={exportCustomTo}
                    onChange={(e) => setExportCustomTo(e.target.value)}
                    min={exportCustomFrom || undefined}
                    max={todayIso()}
                    className={dateInputBaseClass}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleExport}
              disabled={
                status.state === "loading" ||
                exportCooldown ||
                (exportRange.kind === "custom" &&
                  (exportCustomFrom === "" || exportCustomTo === ""))
              }
              className="w-full justify-center"
            >
              {status.state === "loading"
                ? status.message
                : "Download Excel workbook"}
            </Button>
            {status.state === "success" ? (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                ✓ {status.message}
              </p>
            ) : status.state === "error" ? (
              <p className="text-xs font-medium text-rose-700 dark:text-rose-400">
                {status.message}
              </p>
            ) : (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Exports come straight from your current expense list.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
