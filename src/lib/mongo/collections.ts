import "server-only";

import type { Collection } from "mongodb";

import {
  CATEGORIES_COLLECTION,
  EXPENSES_COLLECTION,
  USER_PREFERENCES_COLLECTION,
  type CategoryDoc,
  type ExpenseDoc,
  type UserPreferencesDoc,
} from "@/lib/mongo/documents";
import { ensureMongoIndexes } from "@/lib/mongo/indexes";
import { getMongoDb } from "@/lib/mongodb";

/**
 * Typed collection accessors. Each one guarantees the user-scoped indexes
 * exist before any query runs (memoized, so only the first call pays for
 * index creation) and returns nothing but server-side handles — the Db and
 * collections never cross the server-only boundary.
 */
export async function getExpenseCollection(): Promise<Collection<ExpenseDoc>> {
  const db = getMongoDb();
  await ensureMongoIndexes(db);
  return db.collection<ExpenseDoc>(EXPENSES_COLLECTION);
}

export async function getCategoryCollection(): Promise<Collection<CategoryDoc>> {
  const db = getMongoDb();
  await ensureMongoIndexes(db);
  return db.collection<CategoryDoc>(CATEGORIES_COLLECTION);
}

export async function getPreferencesCollection(): Promise<
  Collection<UserPreferencesDoc>
> {
  const db = getMongoDb();
  await ensureMongoIndexes(db);
  return db.collection<UserPreferencesDoc>(USER_PREFERENCES_COLLECTION);
}
