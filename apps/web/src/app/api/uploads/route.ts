import { forwardJson, errorResponse } from '@/lib/api/proxy';

/**
 * Browser-facing upload endpoints. They exist because the session token is
 * httpOnly (ADR-018); the payloads are the API's own contracts, unchanged.
 */
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
