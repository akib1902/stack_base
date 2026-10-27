import { errorResponse, forwardJson } from '@/lib/api/proxy';

/**
 * Stores the non-secret vault record (KDF parameters, wrapped vault key,
 * verifier). The passphrase and the vault key never leave the browser.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as unknown;
    return await forwardJson('/api/v1/encryption/vault', 'POST', body);
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
