import "server-only";

import type { Db } from "mongodb";

import { CATEGORIES_COLLECTION, EXPENSES_COLLECTION } from "@/lib/mongo/documents";

type GlobalWithMongoIndexes = typeof globalThis & {
  spendlyMongoIndexes?: Promise<void>;
};

const globalWithMongo = globalThis as GlobalWithMongoIndexes;

/**
 * Idempotent index setup (createIndex is a no-op when the index already
 * exists), memoized on globalThis so dev hot-reload reuses the promise
 * instead of re-running createIndexes on every reload. A failed run is
 * cleared so the next call can retry.
 *
 * Indexes (kept deliberately small):
 * - expenses { userId: 1, date: -1, createdAt: -1 }
 *     user-scoped listing + date-range analytics/report queries, in the
 *     app's default order (date desc, createdAt desc tiebreak); the
 *     `userId` prefix also serves any pure "all expenses for user" query.
 * - expenses { userId: 1, categoryId: 1 }
 *     category-filtered lists and the "category in use" delete guard.
 * - categories { userId: 1, slug: 1 } unique
 *     user-scoped slug uniqueness; the `userId` prefix also serves
 *     list-categories, so no separate userId index is needed.
 *
 * `user_preferences` keys directly on `_id` (= userId) and needs none.
 */
export async function ensureMongoIndexes(db: Db): Promise<void> {
  if (!globalWithMongo.spendlyMongoIndexes) {
    globalWithMongo.spendlyMongoIndexes = createIndexes(db).catch((error) => {
      globalWithMongo.spendlyMongoIndexes = undefined;
      throw error;
    });
  }
  return globalWithMongo.spendlyMongoIndexes;
}

async function createIndexes(db: Db): Promise<void> {
  const expenses = db.collection(EXPENSES_COLLECTION);
  const categories = db.collection(CATEGORIES_COLLECTION);

  await Promise.all([
    expenses.createIndex(
      { userId: 1, date: -1, createdAt: -1 },
      { name: "user_date" },
    ),
    expenses.createIndex(
      { userId: 1, categoryId: 1 },
      { name: "user_category" },
    ),
    categories.createIndex(
      { userId: 1, slug: 1 },
      { name: "user_slug", unique: true },
    ),
  ]);
}
