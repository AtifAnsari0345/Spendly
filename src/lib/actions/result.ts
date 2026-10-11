/**
 * Result envelope for server-action mutations.
 *
 * Server Actions mask thrown error messages in production (they surface only
 * a digest), but the app's UI relies on messages like "Expense not found"
 * and "Cannot delete a category that has expenses" (see expense-form,
 * expense-list, data-reset). Mutations therefore return this envelope
 * instead of throwing, and client adapters re-throw the preserved message.
 *
 * Reads still throw — callers only need to know the load failed, never the
 * underlying driver message.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Error messages the app intentionally shows to users. */
const KNOWN_ERRORS: ReadonlySet<string> = new Set([
  "Invalid expense data",
  "Expense not found",
  "Invalid category data",
  "Category not found",
  "Cannot delete a category that has expenses",
  "Default categories cannot be deleted",
  "Invalid theme",
  "Unsupported currency",
  "Invalid locale",
]);

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/**
 * Maps an unknown server error to a client-safe message: known app-level
 * errors keep their exact wording, anything else (driver failures, config
 * problems) becomes a generic message so internals never reach the browser.
 */
export function actionFail(error: unknown): ActionResult<never> {
  const message = error instanceof Error ? error.message : "";
  const known = message.startsWith("Unauthorized:") || KNOWN_ERRORS.has(message);
  return {
    ok: false,
    error: known ? message : "Something went wrong. Please try again.",
  };
}
