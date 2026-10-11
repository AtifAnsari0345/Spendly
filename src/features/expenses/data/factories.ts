import { makeId, nowIso, todayIsoDate } from "@/lib/id";
import type { Expense } from "@/features/expenses/models/expense";
import type { Category } from "@/features/categories/models/category";

export type NewExpenseInput = {
  date?: string;
  title: string;
  amount: number;
  categoryId: string;
  note?: string;
};

export function buildNewExpense(input: NewExpenseInput): Expense {
  const ts = nowIso();
  return {
    id: makeId("exp"),
    date: input.date ?? todayIsoDate(),
    title: input.title.trim(),
    amount: Math.round(input.amount * 100) / 100,
    categoryId: input.categoryId,
    note: (input.note ?? "").trim(),
    createdAt: ts,
    updatedAt: ts,
  };
}

export function buildUpdatedExpense(
  existing: Expense,
  changes: {
    date?: string;
    title?: string;
    amount?: number;
    categoryId?: string;
    note?: string;
  },
): Expense {
  return {
    ...existing,
    date: changes.date ?? existing.date,
    title: changes.title !== undefined ? changes.title.trim() : existing.title,
    amount:
      changes.amount !== undefined
        ? Math.round(changes.amount * 100) / 100
        : existing.amount,
    categoryId: changes.categoryId ?? existing.categoryId,
    note: changes.note !== undefined ? changes.note.trim() : existing.note,
    updatedAt: nowIso(),
  };
}

export type NewCategoryInput = {
  name: string;
  slug: string;
  icon: string;
  colorToken: string;
};

export function buildNewCategory(input: NewCategoryInput): Category {
  const ts = nowIso();
  return {
    id: makeId("cat"),
    name: input.name.trim(),
    slug: input.slug.trim(),
    icon: input.icon.trim(),
    colorToken: input.colorToken.trim(),
    createdAt: ts,
    updatedAt: ts,
  };
}
