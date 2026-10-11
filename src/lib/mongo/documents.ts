import "server-only";

import type { Category } from "@/features/categories/models/category";
import type { Expense } from "@/features/expenses/models/expense";
import type { UserPreferenceSnapshot } from "@/lib/user-preferences/types";

/**
 * Shared, multi-tenant collections.
 *
 * Users are isolated by a `userId` field (the Better Auth user id) rather
 * than per-user collections/databases. `userId` is only ever written from
 * the authenticated server session — never from a request body, query
 * parameter, route parameter, or localStorage.
 */
export const EXPENSES_COLLECTION = "expenses";
export const CATEGORIES_COLLECTION = "categories";
export const USER_PREFERENCES_COLLECTION = "user_preferences";

/**
 * Expense document. All application fields keep their existing names and
 * meanings; the application's string id (`exp_…`) is stored as the Mongo
 * `_id` so it stays globally unique for free and every by-id operation can
 * enforce ownership in a single query: `{ _id, userId }`.
 */
export type ExpenseDoc = Omit<Expense, "id"> & {
  _id: string;
  userId: string;
};

/**
 * Category document.
 *
 * Unlike expense ids, category ids are NOT globally unique — every user
 * owns the SAME seeded `category-<slug>` ids — so the document deliberately
 * does not declare `_id`: the driver assigns an auto-generated ObjectId and
 * the application id lives in the `id` field, scoped by `userId`. (Storing
 * the app id as `_id` would let only the first user ever receive the
 * default categories: everyone else's seed insert would collide on the
 * shared `_id`.)
 */
export type CategoryDoc = Category & {
  userId: string;
};

/** Exactly one document per user; `_id` is the Better Auth user id. */
export type UserPreferencesDoc = UserPreferenceSnapshot & {
  _id: string;
  updatedAt: string;
};

/**
 * The application fields of an expense — used for inserts and $set updates.
 * Built field-by-field (instead of spreading) so an id or `userId` supplied
 * by a caller can never leak into a stored document.
 */
export function expenseFields(expense: Omit<Expense, "id">): Omit<Expense, "id"> {
  return {
    date: expense.date,
    title: expense.title,
    amount: expense.amount,
    categoryId: expense.categoryId,
    note: expense.note,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

export function categoryFields(category: Omit<Category, "id">): Omit<Category, "id"> {
  return {
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    colorToken: category.colorToken,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export function expenseToDoc(expense: Expense, userId: string): ExpenseDoc {
  return { _id: expense.id, userId, ...expenseFields(expense) };
}

export function categoryToDoc(category: Category, userId: string): CategoryDoc {
  return { id: category.id, userId, ...categoryFields(category) };
}

/**
 * Document → application model. `userId` is deliberately dropped: callers
 * only ever see the shape the existing provider/contracts already use.
 */
export function toExpense(doc: ExpenseDoc): Expense {
  return { id: doc._id, ...expenseFields(doc) };
}

export function toCategory(doc: CategoryDoc): Category {
  return { id: doc.id, ...categoryFields(doc) };
}
