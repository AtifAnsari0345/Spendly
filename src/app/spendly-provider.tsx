"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";

import { defaultCategories } from "@/features/categories/data/default-categories";
import type { Category } from "@/features/categories/models/category";
import type { Expense, ExpenseFilters } from "@/features/expenses/models/expense";
import {
  createRemoteCategoryRepository,
  createRemoteExpenseRepository,
} from "@/features/expenses/data/remote-repositories";
import {
  buildNewCategory,
  buildNewExpense,
  buildUpdatedExpense,
  type NewCategoryInput,
  type NewExpenseInput,
} from "@/features/expenses/data/factories";
import {
  clearAllUserDataAction,
  ensureDefaultCategoriesAction,
  getUserPreferencesAction,
  updateUserPreferencesAction,
} from "@/app/data-actions";
import { applyThemeToDocument } from "@/lib/user-preferences/theme-apply";
import {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  type ThemeMode,
  type UserPreferenceSnapshot,
} from "@/lib/user-preferences/types";

export type ToastKind = "success" | "error" | "info";

export type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
};

type SpendlyContextValue = {
  expenses: Expense[];
  categories: Category[];
  loading: boolean;
  initialized: boolean;

  createExpense(input: NewExpenseInput): Promise<Expense>;
  updateExpense(
    id: string,
    changes: Partial<Pick<Expense, "date" | "title" | "amount" | "categoryId" | "note">>,
  ): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
  listExpenses(filters?: ExpenseFilters): Expense[];
  refresh(): Promise<void>;

  createCategory(input: NewCategoryInput): Promise<Category>;
  updateCategory(id: string, changes: Partial<Pick<Category, "name" | "slug" | "icon" | "colorToken">>): Promise<Category>;
  removeCategory(id: string): Promise<void>;
  isSeededCategory(categoryId: string): boolean;

  addModalOpen: boolean;
  openAddModal(): void;
  editingExpense: Expense | null;
  openEditModal(expense: Expense): void;
  closeModals(): void;

  toasts: Toast[];
  pushToast(toast: Omit<Toast, "id">): void;
  dismissToast(id: string): void;

  theme: ThemeMode;
  currency: string;
  locale: string;
  setTheme(theme: ThemeMode): Promise<void>;
  setCurrency(currency: string): Promise<void>;
  setLocale(locale: string): Promise<void>;

  clearAllData(): Promise<void>;
};

const SpendlyContext = createContext<SpendlyContextValue | null>(null);

function makeToastId() {
  return `t_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

/**
 * Persists a preference patch through the server action and resolves with
 * the saved snapshot; throws with the preserved error message on failure.
 */
async function persistPreferences(
  patch: Partial<UserPreferenceSnapshot>,
): Promise<UserPreferenceSnapshot> {
  const result = await updateUserPreferencesAction(patch);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data;
}

export function SpendlyProvider({ children }: PropsWithChildren): ReactNode {
  const expenseRepoRef = useRef(createRemoteExpenseRepository());
  const categoryRepoRef = useRef(createRemoteCategoryRepository());
  const seededCategoryIdsRef = useRef<ReadonlySet<string>>(new Set(defaultCategories.map((c) => c.id)));

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const [theme, setThemeState] = useState<ThemeMode>(DEFAULT_THEME);
  const [currency, setCurrencyState] = useState<string>(DEFAULT_CURRENCY);
  const [locale, setLocaleState] = useState<string>(DEFAULT_LOCALE);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = makeToastId();
    setToasts((prev) => [...prev, { ...toast, id }]);

    const durationMs = toast.kind === "error" ? 5200 : 3200;
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // MongoDB is the authoritative source: expenses, categories (after
      // idempotent default seeding for first-time users), and preferences
      // for the authenticated session's user only.
      const [loadedExpenses, loadedCategories, prefs] = await Promise.all([
        expenseRepoRef.current.list(),
        ensureDefaultCategoriesAction().then(() =>
          categoryRepoRef.current.list(),
        ),
        getUserPreferencesAction(),
      ]);
      setExpenses(loadedExpenses);
      setCategories(loadedCategories);
      setThemeState(prefs.theme);
      setCurrencyState(prefs.currency);
      setLocaleState(prefs.locale);
      applyThemeToDocument(prefs.theme);
    } catch {
      // Existing error pattern: surface a toast rather than silently
      // showing an empty ("other account") state.
      pushToast({
        kind: "error",
        title: "Couldn't load your data",
        description:
          "Something went wrong while loading your account. Reload the page to try again.",
      });
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [pushToast]);

  useEffect(() => {
    const controller = { cancelled: false };
    queueMicrotask(() => {
      if (controller.cancelled) {
        return;
      }
      void refresh();
    });
    return () => {
      controller.cancelled = true;
    };
  }, [refresh]);

  const createExpense = useCallback(
    async (input: NewExpenseInput): Promise<Expense> => {
      const built = buildNewExpense(input);
      const created = await expenseRepoRef.current.create(built);
      setExpenses((prev) => {
        const next = [created, ...prev];
        next.sort((a, b) =>
          a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt > a.createdAt ? 1 : -1,
        );
        return next;
      });
      pushToast({
        kind: "success",
        title: "Expense saved",
        description: `${created.title} — ${created.amount.toFixed(2)}`,
      });
      return created;
    },
    [pushToast],
  );

  const updateExpense = useCallback(
    async (
      id: string,
      changes: Partial<Pick<Expense, "date" | "title" | "amount" | "categoryId" | "note">>,
    ): Promise<Expense> => {
      const existing = expenses.find((e) => e.id === id);
      if (!existing) {
        throw new Error("Expense not found");
      }
      const updated = buildUpdatedExpense(existing, changes);
      const saved = await expenseRepoRef.current.update(id, updated);
      setExpenses((prev) =>
        prev
          .map((e) => (e.id === id ? saved : e))
          .sort((a, b) =>
            a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt > a.createdAt ? 1 : -1,
          ),
      );
      pushToast({
        kind: "success",
        title: "Expense updated",
        description: saved.title,
      });
      return saved;
    },
    [expenses, pushToast],
  );

  const deleteExpense = useCallback(
    async (id: string): Promise<void> => {
      const target = expenses.find((e) => e.id === id);
      await expenseRepoRef.current.remove(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      pushToast({
        kind: "info",
        title: "Expense deleted",
        description: target ? target.title : undefined,
      });
    },
    [expenses, pushToast],
  );

  const listExpenses = useCallback(
    (filters?: ExpenseFilters): Expense[] => {
      if (!filters) {
        return expenses;
      }

      return expenses.filter((e) => {
        const {
          query,
          categoryIds,
          minAmount,
          maxAmount,
          from,
          to,
          month,
          year,
        } = filters;

        if (query) {
          const q = query.trim().toLowerCase();
          const haystack = `${e.title} ${e.note ?? ""}`.toLowerCase();
          if (!haystack.includes(q)) {
            return false;
          }
        }

        if (categoryIds && categoryIds.length > 0 && !categoryIds.includes(e.categoryId)) {
          return false;
        }

        if (typeof minAmount === "number" && e.amount < minAmount) {
          return false;
        }

        if (typeof maxAmount === "number" && e.amount > maxAmount) {
          return false;
        }

        if (from && e.date < from) {
          return false;
        }

        if (to && e.date > to) {
          return false;
        }

        if (typeof month === "number" || typeof year === "number") {
          const [y, m] = e.date.split("-").map((v) => Number(v));
          if (typeof year === "number" && y !== year) {
            return false;
          }
          if (typeof month === "number" && m !== month) {
            return false;
          }
        }

        return true;
      });
    },
    [expenses],
  );

  const openAddModal = useCallback(() => {
    setEditingExpense(null);
    setAddModalOpen(true);
  }, []);

  const openEditModal = useCallback((expense: Expense) => {
    setAddModalOpen(false);
    setEditingExpense(expense);
  }, []);

  const closeModals = useCallback(() => {
    setAddModalOpen(false);
    setEditingExpense(null);
  }, []);

  const isSeededCategory = useCallback((categoryId: string): boolean => {
    return seededCategoryIdsRef.current.has(categoryId);
  }, []);

  const createCategory = useCallback(
    async (input: NewCategoryInput): Promise<Category> => {
      const built = buildNewCategory(input);
      const created = await categoryRepoRef.current.create(built);
      setCategories((prev) => [...prev, created]);
      pushToast({
        kind: "success",
        title: "Category added",
        description: created.name,
      });
      return created;
    },
    [pushToast],
  );

  const updateCategory = useCallback(
    async (
      id: string,
      changes: Partial<Pick<Category, "name" | "slug" | "icon" | "colorToken">>,
    ): Promise<Category> => {
      const existing = categories.find((c) => c.id === id);
      if (!existing) {
        throw new Error("Category not found");
      }
      const merged: Category = {
        ...existing,
        name: changes.name !== undefined ? changes.name.trim() : existing.name,
        slug: changes.slug !== undefined ? changes.slug.trim() : existing.slug,
        icon: changes.icon !== undefined ? changes.icon.trim() : existing.icon,
        colorToken: changes.colorToken !== undefined ? changes.colorToken.trim() : existing.colorToken,
        updatedAt: new Date().toISOString(),
      };
      const saved = await categoryRepoRef.current.update(id, merged);
      setCategories((prev) => prev.map((c) => (c.id === id ? saved : c)));
      pushToast({
        kind: "success",
        title: "Category updated",
        description: saved.name,
      });
      return saved;
    },
    [categories, pushToast],
  );

  const removeCategory = useCallback(
    async (id: string): Promise<void> => {
      if (isSeededCategory(id)) {
        throw new Error("Default categories cannot be deleted");
      }
      const target = categories.find((c) => c.id === id);
      await categoryRepoRef.current.remove(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      pushToast({
        kind: "info",
        title: "Category removed",
        description: target ? target.name : undefined,
      });
    },
    [categories, isSeededCategory, pushToast],
  );

  const setTheme = useCallback(
    async (next: ThemeMode): Promise<void> => {
      const previous = theme;
      setThemeState(next);
      applyThemeToDocument(next);
      try {
        const saved = await persistPreferences({ theme: next });
        setThemeState(saved.theme);
        applyThemeToDocument(saved.theme);
      } catch (error) {
        setThemeState(previous);
        applyThemeToDocument(previous);
        throw error;
      }
    },
    [theme],
  );

  const setCurrency = useCallback(
    async (next: string): Promise<void> => {
      const previous = currency;
      setCurrencyState(next);
      try {
        const saved = await persistPreferences({ currency: next });
        setCurrencyState(saved.currency);
      } catch (error) {
        setCurrencyState(previous);
        throw error;
      }
    },
    [currency],
  );

  const setLocale = useCallback(
    async (next: string): Promise<void> => {
      const previous = locale;
      setLocaleState(next);
      try {
        const saved = await persistPreferences({ locale: next });
        setLocaleState(saved.locale);
      } catch (error) {
        setLocaleState(previous);
        throw error;
      }
    },
    [locale],
  );

  const clearAllData = useCallback(async (): Promise<void> => {
    const result = await clearAllUserDataAction();
    if (!result.ok) {
      throw new Error(result.error);
    }
    setExpenses([]);
    setCategories([...defaultCategories]);
    pushToast({
      kind: "success",
      title: "Data cleared",
      description: "All expenses and custom categories were removed.",
    });
  }, [pushToast]);

  const value = useMemo<SpendlyContextValue>(
    () => ({
      expenses,
      categories,
      loading,
      initialized,
      createExpense,
      updateExpense,
      deleteExpense,
      listExpenses,
      refresh,
      createCategory,
      updateCategory,
      removeCategory,
      isSeededCategory,
      addModalOpen,
      openAddModal,
      editingExpense,
      openEditModal,
      closeModals,
      toasts,
      pushToast,
      dismissToast,
      theme,
      currency,
      locale,
      setTheme,
      setCurrency,
      setLocale,
      clearAllData,
    }),
    [
      expenses,
      categories,
      loading,
      initialized,
      createExpense,
      updateExpense,
      deleteExpense,
      listExpenses,
      refresh,
      createCategory,
      updateCategory,
      removeCategory,
      isSeededCategory,
      addModalOpen,
      openAddModal,
      editingExpense,
      openEditModal,
      closeModals,
      toasts,
      pushToast,
      dismissToast,
      theme,
      currency,
      locale,
      setTheme,
      setCurrency,
      setLocale,
      clearAllData,
    ],
  );

  return (
    <SpendlyContext.Provider value={value}>{children}</SpendlyContext.Provider>
  );
}

export function useSpendly(): SpendlyContextValue {
  const ctx = useContext(SpendlyContext);
  if (!ctx) {
    throw new Error("useSpendly must be used within <SpendlyProvider>");
  }
  return ctx;
}
