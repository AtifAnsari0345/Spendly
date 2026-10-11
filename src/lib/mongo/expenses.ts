import "server-only";

import type { Filter } from "mongodb";

import {
  ExpenseSchema,
  type Expense,
  type ExpenseFilters,
} from "@/features/expenses/models/expense";
import {
  expenseFields,
  expenseToDoc,
  toExpense,
  type ExpenseDoc,
} from "@/lib/mongo/documents";
import { getExpenseCollection } from "@/lib/mongo/collections";
import { requireUser } from "@/lib/session";

/**
 * Server-side expense data access. Mirrors the local `ExpenseRepository`
 * contract (src/features/expenses/data/contracts.ts) so the provider can
 * swap it in later, with two hard rules:
 *
 * 1. The userId is derived from the authenticated Better Auth session on
 *    every call — it is never a parameter, so a browser caller cannot ask
 *    for someone else's data.
 * 2. Ownership is part of every query itself (`{ _id, userId }`), so
 *    get/update/delete can never touch another user's document even if a
 *    caller guesses its id.
 */

export async function listExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  const { id: userId } = await requireUser();
  const collection = await getExpenseCollection();
  const docs = await collection
    .find(buildExpenseFilter(userId, filters))
    .sort({ date: -1, createdAt: -1 })
    .toArray();
  return docs.map(toExpense);
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const { id: userId } = await requireUser();
  const collection = await getExpenseCollection();
  const doc = await collection.findOne({ _id: id, userId });
  return doc ? toExpense(doc) : null;
}

export async function createExpense(input: Expense): Promise<Expense> {
  const { id: userId } = await requireUser();
  const parsed = ExpenseSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid expense data");
  }
  const collection = await getExpenseCollection();
  // Field-by-field doc build strips anything but validated app fields, then
  // stamps the session userId; a colliding `_id` fails as a duplicate key
  // instead of overwriting another user's record.
  await collection.insertOne(expenseToDoc(parsed.data, userId));
  return parsed.data;
}

export async function updateExpense(
  id: string,
  input: Expense,
): Promise<Expense> {
  const { id: userId } = await requireUser();
  const parsed = ExpenseSchema.safeParse({ ...input, id });
  if (!parsed.success) {
    throw new Error("Invalid expense data");
  }
  const collection = await getExpenseCollection();
  const updated = await collection.findOneAndUpdate(
    { _id: id, userId },
    { $set: expenseFields(parsed.data) },
    { returnDocument: "after" },
  );
  if (!updated) {
    throw new Error("Expense not found");
  }
  return toExpense(updated);
}

export async function deleteExpense(id: string): Promise<void> {
  const { id: userId } = await requireUser();
  const collection = await getExpenseCollection();
  const result = await collection.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) {
    throw new Error("Expense not found");
  }
}

/**
 * Translates the app's `ExpenseFilters` (same semantics as the local
 * repository's `expenseMatchesFilters`) into a Mongo filter. `userId` is
 * always applied; everything else is ANDed under `$and`.
 */
function buildExpenseFilter(
  userId: string,
  filters?: ExpenseFilters,
): Filter<ExpenseDoc> {
  const conditions: Array<Filter<ExpenseDoc>> = [];

  if (filters) {
    const { query, categoryIds, minAmount, maxAmount, from, to, month, year } =
      filters;

    const q = query?.trim();
    if (q) {
      // Literal substring match (case-insensitive), like String.includes —
      // with regex metacharacters escaped so user input can't alter the query.
      const pattern = escapeRegExp(q);
      conditions.push({
        $or: [
          { title: { $regex: pattern, $options: "i" } },
          { note: { $regex: pattern, $options: "i" } },
        ],
      });
    }

    if (categoryIds && categoryIds.length > 0) {
      conditions.push({ categoryId: { $in: categoryIds } });
    }

    if (typeof minAmount === "number" || typeof maxAmount === "number") {
      const amount: { $gte?: number; $lte?: number } = {};
      if (typeof minAmount === "number") amount.$gte = minAmount;
      if (typeof maxAmount === "number") amount.$lte = maxAmount;
      conditions.push({ amount });
    }

    if (from || to) {
      const date: { $gte?: string; $lte?: string } = {};
      if (from) date.$gte = from;
      if (to) date.$lte = to;
      conditions.push({ date });
    }

    if (typeof month === "number" || typeof year === "number") {
      // `date` is a zero-padded YYYY-MM-DD string, so year/month filters are
      // anchored prefix matches (month alone matches that month in any year).
      const yearPart =
        typeof year === "number" ? String(year) : "\\d{4}";
      const monthPart =
        typeof month === "number" ? String(month).padStart(2, "0") : "\\d{2}";
      conditions.push({ date: { $regex: `^${yearPart}-${monthPart}-` } });
    }
  }

  if (conditions.length === 0) {
    return { userId };
  }
  return { userId, $and: conditions };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
