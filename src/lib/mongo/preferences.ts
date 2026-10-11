import "server-only";

import { nowIso } from "@/lib/id";
import { getPreferencesCollection } from "@/lib/mongo/collections";
import type { UserPreferencesDoc } from "@/lib/mongo/documents";
import { requireUser } from "@/lib/session";
import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  type ThemeMode,
  type UserPreferenceSnapshot,
} from "@/lib/user-preferences/types";

/**
 * Server-side storage for exactly the preferences the app has today:
 * theme, currency, and locale. One document per user keyed by the session
 * userId — no other preference system.
 */

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function isKnownCurrency(code: unknown): code is string {
  return typeof code === "string" && CURRENCY_OPTIONS.some((o) => o.code === code);
}

/** Missing or invalid stored values fall back to the app's defaults. */
function sanitize(doc: UserPreferencesDoc | null): UserPreferenceSnapshot {
  const locale =
    doc && typeof doc.locale === "string" && doc.locale.trim().length > 0
      ? doc.locale
      : DEFAULT_LOCALE;
  return {
    theme: doc && isThemeMode(doc.theme) ? doc.theme : DEFAULT_THEME,
    currency: doc && isKnownCurrency(doc.currency) ? doc.currency : DEFAULT_CURRENCY,
    locale,
  };
}

export async function getUserPreferences(): Promise<UserPreferenceSnapshot> {
  const { id: userId } = await requireUser();
  const collection = await getPreferencesCollection();
  const doc = await collection.findOne({ _id: userId });
  return sanitize(doc);
}

/**
 * Partially updates the session user's preferences (upserting defaults for
 * anything not yet stored) and returns the merged result. Values are validated
 * against the supported theme/currency sets, and only the three known fields
 * are ever written — a caller-supplied `userId` in the patch cannot survive
 * validation or the field-by-field update.
 */
export async function updateUserPreferences(
  patch: Partial<UserPreferenceSnapshot>,
): Promise<UserPreferenceSnapshot> {
  const { id: userId } = await requireUser();

  const updates: Partial<UserPreferenceSnapshot> = {};
  if (patch.theme !== undefined) {
    if (!isThemeMode(patch.theme)) throw new Error("Invalid theme");
    updates.theme = patch.theme;
  }
  if (patch.currency !== undefined) {
    if (!isKnownCurrency(patch.currency)) throw new Error("Unsupported currency");
    updates.currency = patch.currency;
  }
  if (patch.locale !== undefined) {
    if (typeof patch.locale !== "string" || patch.locale.trim().length === 0) {
      throw new Error("Invalid locale");
    }
    updates.locale = patch.locale.trim();
  }

  const setFields: Partial<UserPreferencesDoc> = {
    ...updates,
    updatedAt: nowIso(),
  };
  // $setOnInsert may not repeat a path that $set writes (MongoDB rejects the
  // conflict), so defaults are supplied only for fields not being updated.
  const insertDefaults: Partial<UserPreferencesDoc> = {};
  if (updates.theme === undefined) insertDefaults.theme = DEFAULT_THEME;
  if (updates.currency === undefined) insertDefaults.currency = DEFAULT_CURRENCY;
  if (updates.locale === undefined) insertDefaults.locale = DEFAULT_LOCALE;

  const collection = await getPreferencesCollection();
  const updated = await collection.findOneAndUpdate(
    { _id: userId },
    { $set: setFields, $setOnInsert: insertDefaults },
    { upsert: true, returnDocument: "after" },
  );
  return sanitize(updated ?? (await collection.findOne({ _id: userId })));
}
