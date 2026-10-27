/**
 * Browser → route handler helper. The token is an httpOnly cookie, so the
 * browser can only reach the API through this app's own handlers (ADR-017);
 * they keep the API's `{ error: { code, message } }` envelope intact, which is
 * what makes a real reason displayable in the UI.
 */

export class BrowserRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'BrowserRequestError';
    this.status = status;
    this.code = code;
  }
}

async function errorFrom(response: Response): Promise<BrowserRequestError> {
  const body = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string } }
    | null;
  return new BrowserRequestError(
    response.status,
    body?.error?.code ?? 'INTERNAL_ERROR',
    body?.error?.message ?? 'The request failed.',
  );
}

export async function sendJson<T>(
  path: string,
  options: { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown },
): Promise<T> {
  const response = await fetch(path, {
    method: options.method,
    cache: 'no-store',
    ...(options.body === undefined
      ? {}
      : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(options.body) }),
  });
  if (!response.ok) throw await errorFrom(response);
  return (await response.json()) as T;
}

/** Raw response for streamed bodies; the caller owns reading and cancelling. */
export async function sendRaw(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, { ...init, cache: 'no-store' });
  if (!response.ok) throw await errorFrom(response);
  return response;
}

export const isBrowserRequestError = (error: unknown): error is BrowserRequestError =>
  error instanceof BrowserRequestError;
