import { ApiError } from '../../errors';

/**
 * Filename rules are enforced server-side. Separators and control characters are
 * rejected so a name can never be interpreted as a path, and `.`/`..` are never
 * valid names.
 */
const FORBIDDEN_NAME_CHARS = /[/\\\u0000-\u001f\u007f]/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string): boolean => UUID.test(value);

export function parseUuid(value: string | null | undefined, field: string): string {
  if (!value || !isUuid(value)) {
    throw new ApiError('VALIDATION_ERROR', 400, `${field} must be a UUID.`);
  }
  return value;
}

/**
 * Optional folder reference used by moves: null (and an empty value produced by
 * form/query coercion) means "no folder", anything else must be a UUID.
 */
export function parseOptionalFolderId(
  value: string | null | undefined,
  field: string,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : parseUuid(trimmed, field);
}

/** Validate and return the canonical form of a folder or file name. */
export function normalizeName(raw: string): string {
  const name = raw.trim();

  if (name.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 400, 'A name is required.');
  }
  if (name.length > 255) {
    throw new ApiError('VALIDATION_ERROR', 400, 'Names are limited to 255 characters.');
  }
  if (name === '.' || name === '..') {
    throw new ApiError('VALIDATION_ERROR', 400, 'That name is reserved.');
  }
  if (FORBIDDEN_NAME_CHARS.test(name)) {
    throw new ApiError(
      'VALIDATION_ERROR',
      400,
      'Names cannot contain slashes or control characters.',
    );
  }

  return name;
}

/** Tags are labels: trimmed, single-line and case-insensitively unique per owner. */
export function normalizeTagName(raw: string): string {
  const name = raw.trim();

  if (name.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 400, 'A tag name is required.');
  }
  if (name.length > 64) {
    throw new ApiError('VALIDATION_ERROR', 400, 'Tag names are limited to 64 characters.');
  }
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    throw new ApiError('VALIDATION_ERROR', 400, 'Tag names cannot contain control characters.');
  }

  return name;
}

export function normalizeDescription(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const description = raw.trim();
  if (description.length > 2000) {
    throw new ApiError('VALIDATION_ERROR', 400, 'Descriptions are limited to 2000 characters.');
  }
  return description.length === 0 ? null : description;
}

/**
 * Lower-case extension without the dot, or null when the name has none. Hidden
 * files (`.env`) and oversized/non-alphanumeric suffixes are treated as having
 * no extension, matching how the category filter interprets them.
 */
export function extensionOf(name: string): string | null {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) {
    return null;
  }
  const candidate = name.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,16}$/.test(candidate) ? candidate : null;
}
