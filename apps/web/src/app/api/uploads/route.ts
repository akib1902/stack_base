import { forwardJson, errorResponse } from '@/lib/api/proxy';

/**
 * Browser-facing upload endpoints. They exist because the session token is
 * httpOnly (ADR-017); the payloads are the API's own contracts, unchanged.
 */

/** Unfinished jobs, so a reloaded tab can rebuild its queue (A5.4). */
export async function GET(): Promise<Response> {
  return forwardJson('/api/v1/uploads', 'GET');
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as unknown;
    return await forwardJson('/api/v1/uploads', 'POST', body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'A JSON body is required.' } },
        { status: 400 },
      );
    }
    return errorResponse(error);
  }
}
