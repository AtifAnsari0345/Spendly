import type {
  CategoryRepository,
  ExpenseRepository,
} from "@/features/expenses/data/contracts";
import {
  createCategoryAction,
  createExpenseAction,
  deleteCategoryAction,
  deleteExpenseAction,
  getExpenseByIdAction,
  listCategoriesAction,
  listExpensesAction,
  updateCategoryAction,
  updateExpenseAction,
} from "@/app/data-actions";
import type { ActionResult } from "@/lib/actions/result";

/**
 * Client-side implementations of the repository contracts, backed by server
 * actions. The provider keeps the same call sites and semantics (including
 * preserved error messages), while all data lives server-side, scoped to the
 * authenticated session — never to anything the browser supplies.
 */

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data;
}

export function createRemoteExpenseRepository(): ExpenseRepository {
  return {
    async list(filters) {
      return listExpensesAction(filters);
    },

    async getById(id) {
      return getExpenseByIdAction(id);
    },

    async create(input) {
      return unwrap(await createExpenseAction(input));
    },

    async update(id, input) {
      return unwrap(await updateExpenseAction(id, input));
    },

    async remove(id) {
      unwrap(await deleteExpenseAction(id));
    },
  };
}

export function createRemoteCategoryRepository(): CategoryRepository {
  return {
    async list() {
      return listCategoriesAction();
    },

    async create(input) {
      return unwrap(await createCategoryAction(input));
    },

    async update(id, input) {
      return unwrap(await updateCategoryAction(id, input));
    },

    async remove(id) {
      unwrap(await deleteCategoryAction(id));
    },
  };
}
