import "server-only";

import { defaultCategories } from "@/features/categories/data/default-categories";
import {
  CategorySchema,
  type Category,
} from "@/features/categories/models/category";
import { getExpenseCollection, getCategoryCollection } from "@/lib/mongo/collections";
import { isDuplicateKeyError } from "@/lib/mongo/errors";
import {
  categoryFields,
  categoryToDoc,
  toCategory,
} from "@/lib/mongo/documents";
import { requireUser } from "@/lib/session";

/**
 * Server-side category data access. Mirrors the local `CategoryRepository`
 * contract (including its "category in use" delete guard) while deriving
 * the userId from the authenticated Better Auth session and enforcing
 * ownership on every by-id operation. Category structure, ids
 * (`category-…` seeds / `cat_…` custom), slugs, and visual properties are
 * preserved exactly.
 */

export async function listCategories(): Promise<Category[]> {
  const { id: userId } = await requireUser();
  const collection = await getCategoryCollection();
  const docs = await collection
    .find({ userId })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
  return docs.map(toCategory);
}

export async function createCategory(input: Category): Promise<Category> {
  const { id: userId } = await requireUser();
  const parsed = CategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid category data");
  }
  const collection = await getCategoryCollection();
  // Field-by-field doc build strips anything but validated app fields, then
  // stamps the session userId; the unique { userId, slug } index rejects
  // duplicate slugs within the user.
  await collection.insertOne(categoryToDoc(parsed.data, userId));
  return parsed.data;
}

export async function updateCategory(
  id: string,
  input: Category,
): Promise<Category> {
  const { id: userId } = await requireUser();
  const parsed = CategorySchema.safeParse({ ...input, id });
  if (!parsed.success) {
    throw new Error("Invalid category data");
  }
  const collection = await getCategoryCollection();
  const updated = await collection.findOneAndUpdate(
    { id, userId },
    { $set: categoryFields(parsed.data) },
    { returnDocument: "after" },
  );
  if (!updated) {
    throw new Error("Category not found");
  }
  return toCategory(updated);
}

export async function deleteCategory(id: string): Promise<void> {
  const { id: userId } = await requireUser();

  // Same product rule the provider enforces: seeds are permanent.
  if (defaultCategories.some((category) => category.id === id)) {
    throw new Error("Default categories cannot be deleted");
  }

  const expenses = await getExpenseCollection();
  const inUse = await expenses.countDocuments(
    { userId, categoryId: id },
    { limit: 1 },
  );
  if (inUse > 0) {
    throw new Error("Cannot delete a category that has expenses");
  }

  const categories = await getCategoryCollection();
  const result = await categories.deleteOne({ id, userId });
  if (result.deletedCount === 0) {
    throw new Error("Category not found");
  }
}

/**
 * Idempotent default-category seeding for a user — the mechanism the
 * provider migration (or a post-signup hook) can call later so a newly
 * registered user receives the app's 13 default categories.
 *
 * Nothing calls this yet; existing user data is never touched by this
 * module. Safe to call repeatedly: it only inserts the stable
 * `category-<slug>` ids that don't exist yet for this user, and a
 * duplicate-key race between concurrent calls is tolerated.
 */
export async function ensureDefaultCategories(): Promise<void> {
  const { id: userId } = await requireUser();
  const collection = await getCategoryCollection();

  const defaultIds = defaultCategories.map((category) => category.id);
  const existing = await collection
    .find({ userId, id: { $in: defaultIds } })
    .toArray();
  const existingIds = new Set(existing.map((doc) => doc.id));
  const missing = defaultCategories.filter(
    (category) => !existingIds.has(category.id),
  );
  if (missing.length === 0) {
    return;
  }

  try {
    await collection.insertMany(
      missing.map((category) => categoryToDoc(category, userId)),
      { ordered: false },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
    // Another call seeded these first — the desired end state, so continue.
  }
}

/**
 * Clears all of the session user's data: every expense plus every category,
 * then restores the pristine default category set (matching the app's
 * "clear all data" behavior). Preferences are intentionally kept.
 */
export async function clearAllUserData(): Promise<void> {
  const { id: userId } = await requireUser();

  // Expenses first so no expense can reference a category that no longer exists.
  const expenses = await getExpenseCollection();
  await expenses.deleteMany({ userId });

  const categories = await getCategoryCollection();
  await categories.deleteMany({ userId });
  await categories.insertMany(
    defaultCategories.map((category) => categoryToDoc(category, userId)),
  );
}
