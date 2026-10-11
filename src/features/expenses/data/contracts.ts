import type { Category } from "@/features/categories/models/category";
import type { Expense, ExpenseFilters } from "@/features/expenses/models/expense";

export type ExpenseRepository = {
  list(filters?: ExpenseFilters): Promise<Expense[]>;
  getById(id: string): Promise<Expense | null>;
  create(input: Expense): Promise<Expense>;
  update(id: string, input: Expense): Promise<Expense>;
  remove(id: string): Promise<void>;
};

export type CategoryRepository = {
  list(): Promise<Category[]>;
  create(input: Category): Promise<Category>;
  update(id: string, input: Category): Promise<Category>;
  remove(id: string): Promise<void>;
};
