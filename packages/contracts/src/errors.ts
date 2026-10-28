/**
 * Stable error codes from SRS A11. Every API error response carries one of
 * these codes; clients branch on the code, never on the message text.
 */
export const ERROR_CODES = [
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'FILE_TOO_LARGE',
  'STORAGE_DISCONNECTED',
  'TELEGRAM_RATE_LIMIT',
  'TELEGRAM_SESSION_EXPIRED',
  'UPLOAD_SOURCE_REQUIRED',
  'UPLOAD_STATE_CONFLICT',
  'UPLOAD_INTEGRITY_FAILED',
  'ENCRYPTION_FAILED',
  'DECRYPTION_FAILED',
  'FILE_NOT_FOUND',
  'VERSION_NOT_FOUND',
  'SHARE_EXPIRED',
  'SHARE_REVOKED',
  'DATABASE_UNAVAILABLE',
  'STORAGE_RECONCILIATION_REQUIRED',
  // Added in Milestone 3 (ADR-018); the A11 list is explicitly non-exhaustive.
  'VAULT_ALREADY_EXISTS',
  'TELEGRAM_NOT_CONFIGURED',
  'UPLOAD_NOT_FOUND',
  // Added in Milestone 5 (ADR-019): share links distinguish every refusal so
  // the recipient page can explain it without learning anything else.
  'SHARE_NOT_FOUND',
  'SHARE_KEY_UNAVAILABLE',
  'SHARE_FILE_UNAVAILABLE',
  'SHARE_DOWNLOAD_LIMIT_REACHED',
  'RATE_LIMITED',
  'ROUTE_NOT_FOUND',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
