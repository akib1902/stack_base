import type { ErrorCode, HealthResponse } from '@stackbase/contracts';
import { getSessionToken } from '../auth/session';

const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');

export class UnauthenticatedError extends Error {
  constructor() {
    super('No valid session.');
    this.name = 'UnauthenticatedError';
  }
}

export class ApiUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('The API is unreachable.', { cause });
    this.name = 'ApiUnavailableError';
  }
}

export class ApiRequestError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, status: number, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

interface ApiErrorBody {
  error?: { code?: ErrorCode; message?: string };
}

async function request<T>(
  path: string,
  init: RequestInit | undefined,
  token: string | null,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (error) {
    throw new ApiUnavailableError(error);
  }

  if (response.status === 401) {
    throw new UnauthenticatedError();
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiRequestError(
      body?.error?.code ?? 'INTERNAL_ERROR',
      response.status,
      body?.error?.message ?? 'The request failed.',
    );
  }

  return (await response.json()) as T;
}

/** Authenticated API call; requires a session cookie on the current request. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();
  if (!token) {
    throw new UnauthenticatedError();
  }
  return request<T>(path, init, token);
}

/** Unauthenticated call used by the sign-in flow. */
export async function apiFetchPublic<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init, null);
}

export async function apiHealth(): Promise<HealthResponse> {
  try {
    return await request<HealthResponse>('/health', undefined, null);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 503) {
      return {
        status: 'degraded',
        version: 'unknown',
        uptimeSeconds: 0,
        database: 'unavailable',
      };
    }
    throw error;
  }
}
