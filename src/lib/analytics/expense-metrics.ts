import type { Category } from "@/features/categories/models/category";
import type { Expense } from "@/features/expenses/models/expense";
import { todayIsoDate } from "@/lib/id";

export function calculateTotalExpenses(expenses: Expense[]) {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

export function calculateExpenseCount(expenses: Expense[]) {
  return expenses.length;
}

export function calculateAverageDailySpend(
  expenses: Expense[],
  dayCount: number,
) {
  if (dayCount <= 0) {
    return 0;
  }

  return calculateTotalExpenses(expenses) / dayCount;
}

export function calculateCategoryTotals(
  expenses: Expense[],
  categories: Category[],
) {
  return categories
    .map((category) => {
      const matching = expenses.filter(
        (expense) => expense.categoryId === category.id,
      );
      return {
        category,
        total: matching.reduce((sum, expense) => sum + expense.amount, 0),
        count: matching.length,
      };
    })
    .filter((entry) => entry.total > 0)
    .sort((left, right) => right.total - left.total);
}

export function findTopCategory(expenses: Expense[], categories: Category[]) {
  return calculateCategoryTotals(expenses, categories)[0] ?? null;
}

function daysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isoDateToUtc(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map((value) => Number(value));
  return Date.UTC(year, (month || 1) - 1, day || 1);
}

/** Inclusive first/last calendar day of a month, as ISO (YYYY-MM-DD) dates. */
export function monthBoundsIso(
  year: number,
  monthOneIndexed: number,
): { from: string; to: string } {
  return {
    from: `${year}-${pad2(monthOneIndexed)}-01`,
    to: `${year}-${pad2(monthOneIndexed)}-${pad2(daysInMonth(year, monthOneIndexed - 1))}`,
  };
}

/**
 * The single definition of "days elapsed" behind every average-per-day figure.
 * Dashboard, Analytics and Reports all call it, so equivalent date ranges always
 * produce the same average:
 *
 *   average per day = total spend in the range / elapsed days in the range
 *
 * Days are counted inclusively from the start of the range up to today, so a
 * range that is still running (this month, this year) is never divided by days
 * that have not happened yet, while a range that has already finished counts all
 * of its days. Every calendar day counts, including days with no entries -- the
 * divisor is the length of the range in days, not the number of days that happen
 * to contain expenses (those "active days" are what the daily charts plot).
 *
 * A range that has not started yet has 0 elapsed days. An empty `fromIso` means
 * there is no range to measure.
 */
export function elapsedDaysInRange(fromIso: string, toIso: string): number {
  if (!fromIso) {
    return 0;
  }

  const today = todayIsoDate();
  const end = !toIso || toIso > today ? today : toIso;
  if (fromIso > end) {
    return 0;
  }
  return Math.round((isoDateToUtc(end) - isoDateToUtc(fromIso)) / 86_400_000) + 1;
}

export function elapsedDaysInMonth(
  year: number,
  monthOneIndexed: number,
): number {
  const { from, to } = monthBoundsIso(year, monthOneIndexed);
  return elapsedDaysInRange(from, to);
}

export function filterExpensesByMonth(
  expenses: Expense[],
  year: number,
  monthOneIndexed: number,
): Expense[] {
  const target = `${year}-${String(monthOneIndexed).padStart(2, "0")}`;
  return expenses.filter((e) => e.date.startsWith(target));
}

export function getCurrentMonthYear(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

export function formatMonthLabel(year: number, monthOneIndexed: number): string {
  const date = new Date(year, monthOneIndexed - 1, 1);
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export type DailyTotal = {
  date: string;
  total: number;
};

export function dailyTotals(
  expenses: Expense[],
  options?: { year?: number; month?: number; from?: string; to?: string },
): DailyTotal[] {
  const year = options?.year;
  const month = options?.month;
  const from = options?.from;
  const to = options?.to;

  const filtered = expenses.filter((e) => {
    if (typeof year === "number" || typeof month === "number") {
      const [ey, em] = e.date.split("-").map((v) => Number(v));
      if (typeof year === "number" && ey !== year) return false;
      if (typeof month === "number" && em !== month) return false;
    }
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });

  const map = new Map<string, number>();
  for (const expense of filtered) {
    map.set(expense.date, (map.get(expense.date) ?? 0) + expense.amount);
  }

  const days: DailyTotal[] = [];
  for (const [date, total] of map) {
    days.push({ date, total: Math.round(total * 100) / 100 });
  }
  days.sort((a, b) => (a.date < b.date ? -1 : 1));
  return days;
}

export type MonthlyTotal = {
  month: string;
  year: number;
  monthOneIndexed: number;
  total: number;
  label: string;
};

export function monthlyTotals(
  expenses: Expense[],
  options?: { minMonth?: string; maxMonth?: string; limit?: number },
): MonthlyTotal[] {
  const minMonth = options?.minMonth;
  const maxMonth = options?.maxMonth;

  const map = new Map<string, number>();
  for (const expense of expenses) {
    const key = expense.date.slice(0, 7);
    if (minMonth && key < minMonth) continue;
    if (maxMonth && key > maxMonth) continue;
    map.set(key, (map.get(key) ?? 0) + expense.amount);
  }

  const months: MonthlyTotal[] = [];
  for (const [key, total] of map) {
    const [y, m] = key.split("-").map((v) => Number(v));
    months.push({
      month: key,
      year: y,
      monthOneIndexed: m,
      total: Math.round(total * 100) / 100,
      label: formatMonthLabel(y, m),
    });
  }
  months.sort((a, b) => (a.month < b.month ? -1 : 1));

  if (typeof options?.limit === "number" && options.limit > 0) {
    return months.slice(-options.limit);
  }
  return months;
}

export type MonthlyComparison = {
  currentTotal: number;
  previousTotal: number;
  delta: number;
  deltaPct: number | null;
  direction: "up" | "down" | "flat";
};

export function calculateMonthlyComparison(
  currentMonthExpenses: Expense[],
  previousMonthExpenses: Expense[],
): MonthlyComparison {
  const currentTotal = calculateTotalExpenses(currentMonthExpenses);
  const previousTotal = calculateTotalExpenses(previousMonthExpenses);
  const delta = Math.round((currentTotal - previousTotal) * 100) / 100;

  let deltaPct: number | null = null;
  if (previousTotal > 0) {
    const raw = (delta / previousTotal) * 100;
    deltaPct = Math.round(raw * 100) / 100;
  }

  let direction: "up" | "down" | "flat" = "flat";
  if (delta > 0.0001) direction = "up";
  else if (delta < -0.0001) direction = "down";

  return { currentTotal, previousTotal, delta, deltaPct, direction };
}

export function previousMonthExpenses(
  expenses: Expense[],
  currentYear: number,
  currentMonthOneIndexed: number,
): Expense[] {
  const prevDate = new Date(currentYear, currentMonthOneIndexed - 2, 1);
  return filterExpensesByMonth(
    expenses,
    prevDate.getFullYear(),
    prevDate.getMonth() + 1,
  );
}

export type CategoryChangeEntry = {
  category: Category;
  fromTotal: number;
  toTotal: number;
  delta: number;
  deltaPct: number | null;
  direction: "up" | "down" | "flat";
  share: number | null;
};

export function categoryChange(
  fromExpenses: Expense[],
  toExpenses: Expense[],
  categories: Category[],
): CategoryChangeEntry[] {
  const fromTotals = calculateCategoryTotals(fromExpenses, categories);
  const toTotals = calculateCategoryTotals(toExpenses, categories);

  const fromMap = new Map<string, number>();
  for (const entry of fromTotals) fromMap.set(entry.category.id, entry.total);

  const toMap = new Map<string, number>();
  const toTotalOverall = calculateTotalExpenses(toExpenses);
  for (const entry of toTotals) toMap.set(entry.category.id, entry.total);

  const entries = new Map<string, CategoryChangeEntry>();
  const push = (cat: Category) => {
    if (entries.has(cat.id)) return;
    const fromTotal = fromMap.get(cat.id) ?? 0;
    const toTotal = toMap.get(cat.id) ?? 0;
    if (fromTotal === 0 && toTotal === 0) return;

    const delta = Math.round((toTotal - fromTotal) * 100) / 100;

    let deltaPct: number | null = null;
    if (fromTotal > 0) {
      const raw = (delta / fromTotal) * 100;
      deltaPct = Math.round(raw * 100) / 100;
    }

    let direction: "up" | "down" | "flat" = "flat";
    if (delta > 0.0001) direction = "up";
    else if (delta < -0.0001) direction = "down";

    const share =
      toTotalOverall > 0
        ? Math.round((toTotal / toTotalOverall) * 10000) / 100
        : null;

    entries.set(cat.id, {
      category: cat,
      fromTotal,
      toTotal,
      delta,
      deltaPct,
      direction,
      share,
    });
  };

  for (const entry of fromTotals) push(entry.category);
  for (const entry of toTotals) push(entry.category);

  const result = [...entries.values()];
  result.sort((a, b) => b.toTotal - a.toTotal);
  return result;
}

export function findLargestExpense(expenses: Expense[]): Expense | null {
  if (expenses.length === 0) return null;

  let best = expenses[0];
  for (let i = 1; i < expenses.length; i++) {
    if (expenses[i].amount > best.amount) best = expenses[i];
  }
  return best;
}

export function findTopExpenses(
  expenses: Expense[],
  limit: number = 5,
): Expense[] {
  if (expenses.length === 0 || limit <= 0) return [];
  const copy = [...expenses];
  copy.sort((a, b) =>
    b.amount > a.amount
      ? 1
      : b.amount < a.amount
        ? -1
        : b.date < a.date
          ? -1
          : b.date > a.date
            ? 1
            : b.createdAt.localeCompare(a.createdAt),
  );
  return copy.slice(0, limit);
}

export type CategoryRankingEntry = {
  category: Category;
  total: number;
  count: number;
  share: number | null;
  rank: number;
};

export function calculateCategoryRankings(
  expenses: Expense[],
  categories: Category[],
): CategoryRankingEntry[] {
  const totals = calculateCategoryTotals(expenses, categories);
  const overallTotal = calculateTotalExpenses(expenses);

  const expenseCounts = new Map<string, number>();
  for (const expense of expenses) {
    expenseCounts.set(
      expense.categoryId,
      (expenseCounts.get(expense.categoryId) ?? 0) + 1,
    );
  }

  return totals.map((entry, index) => ({
    category: entry.category,
    total: entry.total,
    count: expenseCounts.get(entry.category.id) ?? 0,
    share:
      overallTotal > 0
        ? Math.round((entry.total / overallTotal) * 10000) / 100
        : null,
    rank: index + 1,
  }));
}
