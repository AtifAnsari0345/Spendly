import type { Category } from "@/features/categories/models/category";

const now = "2026-10-01T00:00:00.000Z";

export const defaultCategories: Category[] = [
  ["food", "Food", "utensils", "amber"],
  ["groceries", "Groceries", "basket", "emerald"],
  ["transport", "Transport", "car", "sky"],
  ["shopping", "Shopping", "bag", "violet"],
  ["bills", "Bills", "receipt", "rose"],
  ["rent", "Rent", "home", "slate"],
  ["healthcare", "Healthcare", "pulse", "red"],
  ["education", "Education", "book", "indigo"],
  ["entertainment", "Entertainment", "spark", "orange"],
  ["travel", "Travel", "plane", "cyan"],
  ["subscriptions", "Subscriptions", "refresh", "purple"],
  ["personal", "Personal", "user", "pink"],
  ["other", "Other", "dots", "zinc"],
].map(([slug, name, icon, colorToken]) => ({
  id: `category-${slug}`,
  name,
  slug,
  icon,
  colorToken,
  createdAt: now,
  updatedAt: now,
}));
