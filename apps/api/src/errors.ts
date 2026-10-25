import type { ErrorCode } from '@stackbase/contracts';

/**
 * Domain error carrying a stable SRS error code. The HTTP layer maps it to a
 * response; nothing provider-specific or stack-trace-like is exposed to clients.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    statusCode: number,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const authRequired = (message = 'Authentication is required for this resource.'): ApiError =>
  new ApiError('AUTH_REQUIRED', 401, message);

export const forbidden = (message = 'You do not have access to this resource.'): ApiError =>
  new ApiError('FORBIDDEN', 403, message);
