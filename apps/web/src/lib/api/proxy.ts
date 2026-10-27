import {
  ApiRequestError,
  ApiUnavailableError,
  UnauthenticatedError,
  apiFetch,
} from './client';

/**
 * The session token lives in an httpOnly cookie, so the browser cannot talk to
 * the API directly. Every browser-initiated call (uploads, downloads, vault
 * creation) goes through a Next route handler, which attaches the token and
 * forwards the response — see ADR-017.
 */

const ERROR_HEADERS = { 'cache-control': 'no-store' } as const;

function errorResponse(error: unknown): Response {
  if (error instanceof UnauthenticatedError) {
    return Response.json(
      { error: { code: 'AUTH_REQUIRED', message: 'Sign in again to continue.' } },
      { status: 401, headers: ERROR_HEADERS },
    );
  }
  if (error instanceof ApiRequestError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: ERROR_HEADERS },
    );
  }
  if (error instanceof ApiUnavailableError) {
    return Response.json(
      { error: { code: 'DATABASE_UNAVAILABLE', message: 'The API is unreachable.' } },
      { status: 502, headers: ERROR_HEADERS },
    );
  }
  return Response.json(
    { error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' } },
    { status: 500, headers: ERROR_HEADERS },
  );
}

/** Forwards a JSON request/response pair to the API on behalf of the browser. */
export async function forwardJson(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<Response> {
  try {
    const data = await apiFetch<unknown>(path, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return Response.json(data, { headers: ERROR_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Forwards a binary request body (an encrypted chunk) to the API. */
export async function forwardBinary(
  path: string,
  method: 'PUT' | 'POST',
  body: ArrayBuffer,
  headers: Record<string, string>,
): Promise<Response> {
  try {
    const data = await apiFetch<unknown>(path, {
      method,
      body: new Uint8Array(body),
      headers,
    });
    return Response.json(data, { headers: ERROR_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Maps a failed API response into the same error envelope the proxy uses. */
export async function responseError(response: Response): Promise<Response> {
  const body = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string } }
    | null;
  return Response.json(
    {
      error: {
        code: body?.error?.code ?? 'INTERNAL_ERROR',
        message: body?.error?.message ?? 'The request could not be completed.',
      },
    },
    { status: response.status, headers: ERROR_HEADERS },
  );
}

export { errorResponse };
