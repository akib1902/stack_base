import { errorResponse, forwardJson } from '@/lib/api/proxy';

/**
 * Telegram connection flow: start a login, answer the code or the two-factor
 * password, or revalidate the stored session. Only non-secret material crosses
 * this boundary — the session string is sealed server-side and never returned.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { action?: string; request?: unknown } | null;
    if (!body || typeof body !== 'object') {
      throw new SyntaxError('missing body');
    }

    switch (body.action) {
      case 'authorize':
        return await forwardJson('/api/v1/storage/telegram/authorize', 'POST', body.request);
      case 'verify':
        return await forwardJson('/api/v1/storage/telegram/verify', 'POST', body.request);
      case 'disconnect':
        return await forwardJson('/api/v1/storage/telegram/disconnect', 'POST');
      default:
        return Response.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Unknown storage action.' } },
          { status: 400 },
        );
    }
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