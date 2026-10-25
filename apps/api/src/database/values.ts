/**
 * Normalize a timestamp value from either database driver into an ISO string.
 * pg and PGlite both return Date objects for timestamptz, but rows can also be
 * text after an explicit cast.
 */
export const toIsoString = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : String(value);

/** bigint aggregates arrive as strings from pg; always coerce explicitly. */
export const toCount = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};
