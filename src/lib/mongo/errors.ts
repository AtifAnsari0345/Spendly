import "server-only";

/**
 * Detects MongoDB duplicate-key failures (code 11000), including those
 * raised by bulk writes such as `insertMany(..., { ordered: false })`.
 *
 * Used by the import/merge paths where a duplicate key is an expected
 * conflict signal (already imported, or an id owned elsewhere), never a
 * reason to abort the whole operation.
 */
export function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  if (code === 11000) {
    return true;
  }
  const writeErrors = (error as { writeErrors?: Array<{ code?: unknown }> })
    .writeErrors;
  return (
    Array.isArray(writeErrors) &&
    writeErrors.some((writeError) => writeError?.code === 11000)
  );
}
