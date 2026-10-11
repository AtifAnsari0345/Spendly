import * as XLSX from "xlsx";

import type { Category } from "@/features/categories/models/category";
import type { Expense } from "@/features/expenses/models/expense";
import {
  calculateCategoryTotals,
  monthlyTotals,
} from "@/lib/analytics/expense-metrics";

export type ExportRange =
  | { kind: "this-month" }
  | { kind: "last-month" }
  | { kind: "this-year" }
  | { kind: "all-time" }
  | { kind: "custom"; fromIso: string; toIso: string };

export type ExportProgressStatus =
  | { state: "idle" }
  | { state: "loading"; message: string }
  | { state: "success"; message: string; filename: string; rows: number }
  | { state: "error"; message: string };

function pad2(v: number): string {
  return String(v).padStart(2, "0");
}

function fileNameForRange(range: ExportRange, today = new Date()): string {
  const isoToday = `${today.getFullYear()}${pad2(today.getMonth() + 1)}${pad2(today.getDate())}`;
  switch (range.kind) {
    case "this-month":
      return `Spendly-this-month-${isoToday}.xlsx`;
    case "last-month":
      return `Spendly-last-month-${isoToday}.xlsx`;
    case "this-year":
      return `Spendly-this-year-${isoToday}.xlsx`;
    case "all-time":
      return `Spendly-all-time-${isoToday}.xlsx`;
    case "custom":
      return `Spendly-export-${range.fromIso.replaceAll("-", "")}-${range.toIso.replaceAll("-", "")}.xlsx`;
  }
}

function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function filterExpensesForRange(
  expenses: Expense[],
  range: ExportRange,
): { filtered: Expense[]; label: string; fromIso: string; toIso: string } {
  const { year, month } = getCurrentYearMonth();

  let filtered: Expense[] = [];
  let fromIso = "";
  let toIso = "";
  let label = "";

  switch (range.kind) {
    case "this-month": {
      const prefix = `${year}-${pad2(month)}-`;
      filtered = expenses.filter((e) => e.date.startsWith(prefix));
      fromIso = `${year}-${pad2(month)}-01`;
      toIso = `${year}-${pad2(month)}-${pad2(new Date(year, month, 0).getDate())}`;
      label = `${year} ${pad2(month)}`;
      break;
    }
    case "last-month": {
      const last = new Date(year, month - 2, 1);
      const ly = last.getFullYear();
      const lm = last.getMonth() + 1;
      const prefix = `${ly}-${pad2(lm)}-`;
      filtered = expenses.filter((e) => e.date.startsWith(prefix));
      fromIso = `${ly}-${pad2(lm)}-01`;
      toIso = `${ly}-${pad2(lm)}-${pad2(new Date(ly, lm, 0).getDate())}`;
      label = `${ly} ${pad2(lm)}`;
      break;
    }
    case "this-year": {
      const prefix = `${year}-`;
      filtered = expenses.filter((e) => e.date.startsWith(prefix));
      fromIso = `${year}-01-01`;
      toIso = `${year}-12-31`;
      label = `${year}`;
      break;
    }
    case "all-time": {
      filtered = expenses.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
      if (filtered.length > 0) {
        fromIso = filtered[0].date;
        toIso = filtered[filtered.length - 1].date;
      }
      label = "All time";
      break;
    }
    case "custom": {
      fromIso = range.fromIso;
      toIso = range.toIso;
      filtered = expenses.filter((e) => e.date >= fromIso && e.date <= toIso);
      label = `${fromIso} → ${toIso}`;
      break;
    }
  }

  return {
    filtered: filtered.slice().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.createdAt < b.createdAt ? -1 : 1;
    }),
    label,
    fromIso,
    toIso,
  };
}

function buildDetailRows(
  expenses: Expense[],
  categoryById: Map<string, Category>,
): {
  Date: string;
  Title: string;
  Category: string;
  Amount: number;
  Note: string;
}[] {
  return expenses.map((exp) => ({
    Date: exp.date,
    Title: exp.title,
    Category: categoryById.get(exp.categoryId)?.name ?? "Uncategorized",
    Amount: Math.round(exp.amount * 100) / 100,
    Note: exp.note ?? "",
  }));
}

function buildCategorySummaryRows(
  expenses: Expense[],
  categories: Category[],
  overallTotal: number,
): {
  Category: string;
  Total: number;
  Count: number;
  Share: number;
}[] {
  const rows = calculateCategoryTotals(expenses, categories)
    .slice()
    .sort((a, b) => b.total - a.total)
    .map((row) => ({
      Category: row.category.name,
      Total: Math.round(row.total * 100) / 100,
      Count: row.count,
      Share: overallTotal > 0 ? Math.round((row.total / overallTotal) * 10_000) / 10_000 : 0,
    }));
  return rows;
}

function buildMonthlySummaryRows(expenses: Expense[]): {
  Month: string;
  Total: number;
  Count: number;
}[] {
  return monthlyTotals(expenses, { limit: 120 }).map((m) => ({
    Month: `${m.year}-${pad2(m.monthOneIndexed)}`,
    Total: Math.round(m.total * 100) / 100,
    Count: 0,
  }));
}

export async function exportExpensesToExcel(params: {
  expenses: Expense[];
  categories: Category[];
  range: ExportRange;
  onStatus?: (status: ExportProgressStatus) => void;
}): Promise<ExportProgressStatus> {
  const { expenses, categories, range, onStatus } = params;

  onStatus?.({ state: "loading", message: "Preparing expenses…" });

  await new Promise((resolve) => setTimeout(resolve, 120));

  const { filtered, label } = filterExpensesForRange(expenses, range);

  if (filtered.length === 0) {
    const status: ExportProgressStatus = {
      state: "error",
      message: "No expenses fall within the selected range.",
    };
    onStatus?.(status);
    return status;
  }

  onStatus?.({ state: "loading", message: "Building workbook…" });
  await new Promise((resolve) => setTimeout(resolve, 80));

  try {
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const overallTotal = Math.round(
      filtered.reduce((sum, e) => sum + e.amount, 0) * 100,
    ) / 100;

    const wb = XLSX.utils.book_new();

    const detailRows = buildDetailRows(filtered, categoryById);
    const detailSheet = XLSX.utils.json_to_sheet(detailRows, {
      header: ["Date", "Title", "Category", "Amount", "Note"],
    });
    detailSheet["!cols"] = [
      { wch: 12 },
      { wch: 28 },
      { wch: 16 },
      { wch: 12 },
      { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, detailSheet, "Expenses");

    const categoryRows = buildCategorySummaryRows(
      filtered,
      categories,
      overallTotal,
    );
    const summarySheet = XLSX.utils.json_to_sheet(categoryRows, {
      header: ["Category", "Total", "Count", "Share"],
    });
    summarySheet["!cols"] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 8 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, summarySheet, "Category Totals");

    const monthlyRows = buildMonthlySummaryRows(filtered);
    for (let i = 0; i < monthlyRows.length; i += 1) {
      const prefix = monthlyRows[i].Month;
      monthlyRows[i].Count = filtered.filter((e) =>
        e.date.startsWith(prefix),
      ).length;
    }
    const monthlySheet = XLSX.utils.json_to_sheet(monthlyRows, {
      header: ["Month", "Total", "Count"],
    });
    monthlySheet["!cols"] = [{ wch: 10 }, { wch: 12 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, monthlySheet, "Monthly Totals");

    onStatus?.({ state: "loading", message: "Finalizing file…" });
    await new Promise((resolve) => setTimeout(resolve, 80));

    const filename = fileNameForRange(range);
    XLSX.writeFile(wb, filename);

    const status: ExportProgressStatus = {
      state: "success",
      message: `Exported ${filtered.length} expenses for ${label}.`,
      filename,
      rows: filtered.length,
    };
    onStatus?.(status);
    return status;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to create the export file.";
    const status: ExportProgressStatus = {
      state: "error",
      message,
    };
    onStatus?.(status);
    return status;
  }
}
