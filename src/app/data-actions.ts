"use server";

import type { Category } from "@/features/categories/models/category";
import type {
  Expense,
  ExpenseFilters,
} from "@/features/expenses/models/expense";
import {
  clearAllUserData,
  ensureDefaultCategories,
  listCategories,
  createCategory as createCategoryRepo,
  updateCategory as updateCategoryRepo,
  deleteCategory as deleteCategoryRepo,
} from "@/lib/mongo/categories";
import {
  listExpenses,
  getExpenseById,
  createExpense as createExpenseRepo,
  updateExpense as updateExpenseRepo,
  deleteExpense as deleteExpenseRepo,
} from "@/lib/mongo/expenses";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/lib/mongo/preferences";
import { actionFail, actionOk, type ActionResult } from "@/lib/actions/result";import type { UserPreferenceSnapshot } from "@/lib/user-preferences/types";

/**
 * The single client-to-server boundary for Spendly's data layer.
 *
 * Client components (via the provider) call these actions; every underlying
 * repository function derives the userId from the authenticated Better Auth
 * server session, so a browser caller can only ever touch its own records —
 * no userId is ever accepted as an argument, and MongoDB code never crosses
 * into the browser bundle.
 *
 * Reads return data directly and throw on failure; mutations return an
 * `ActionResult` so known app-level error messages survive production's
 * server-action error masking.
 */

export async function listExpensesAction(
  filters?: ExpenseFilters,
): Promise<Expense[]> {
  return listExpenses(filters);
}

export async function getExpenseByIdAction(
  id: string,
): Promise<Expense | null> {
  return getExpenseById(id);
}

export async function createExpenseAction(
  input: Expense,
): Promise<ActionResult<Expense>> {
  try {
    return actionOk(await createExpenseRepo(input));
  } catch (error) {
    return actionFail(error);
  }
}

export async function updateExpenseAction(
  id: string,
  input: Expense,
): Promise<ActionResult<Expense>> {
  try {
    return actionOk(await updateExpenseRepo(id, input));
  } catch (error) {
    return actionFail(error);
  }
}

export async function deleteExpenseAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    await deleteExpenseRepo(id);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}

export async function listCategoriesAction(): Promise<Category[]> {
  return listCategories();
}

export async function createCategoryAction(
  input: Category,
): Promise<ActionResult<Category>> {
  try {
    return actionOk(await createCategoryRepo(input));
  } catch (error) {
    return actionFail(error);
  }
}

export async function updateCategoryAction(
  id: string,
  input: Category,
): Promise<ActionResult<Category>> {
  try {
    return actionOk(await updateCategoryRepo(id, input));
  } catch (error) {
    return actionFail(error);
  }
}

export async function deleteCategoryAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    await deleteCategoryRepo(id);
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}

/** Idempotent — safe to run on every load; never duplicates seed categories. */
export async function ensureDefaultCategoriesAction(): Promise<void> {
  await ensureDefaultCategories();
}

export async function getUserPreferencesAction(): Promise<UserPreferenceSnapshot> {
  return getUserPreferences();
}

export async function updateUserPreferencesAction(
  patch: Partial<UserPreferenceSnapshot>,
): Promise<ActionResult<UserPreferenceSnapshot>> {
  try {
    return actionOk(await updateUserPreferences(patch));
  } catch (error) {
    return actionFail(error);
  }
}

/** Wipes the session user's expenses/categories and restores the seeds. */
export async function clearAllUserDataAction(): Promise<ActionResult<void>> {
  try {
    await clearAllUserData();
    return actionOk(undefined);
  } catch (error) {
    return actionFail(error);
  }
}
