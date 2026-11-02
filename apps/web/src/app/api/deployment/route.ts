import { errorResponse, forwardJson } from '@/lib/api/proxy';

/**
 * Browser boundary for owner-managed integration settings.
 *
 * The access token remains in the httpOnly cookie and the API base URL remains
 * server-side. PUT requires a same-origin browser request in addition to the
 * session + database owner check, which closes the cookie-authenticated CSRF
 * path for this high-impact endpoint.
 */

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    return source.protocol === target.protocol && source.host === target.host;
  } catch {
    return false;
  }
}

function forbidden(): Response {
  return Response.json(
    { error: { code: 'FORBIDDEN', message: 'This request must come from the StackBase web origin.' } },
    { status: 403, headers: { 'cache-control': 'no-store' } },
  );
}

export async function GET(): Promise<Response> {
  return forwardJson('/api/v1/admin/deployment', 'GET');
}

export async function PUT(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return forbidden();

  try {
    const body = (await request.json()) as unknown;
    return await forwardJson('/api/v1/admin/deployment', 'PUT', body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'A JSON body is required.' } },
        { status: 400, headers: { 'cache-control': 'no-store' } },
      );
    }
    return errorResponse(error);
  }
}
