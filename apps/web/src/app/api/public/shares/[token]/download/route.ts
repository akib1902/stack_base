import { apiFetchPublicStream } from '@/lib/api/client';
import { errorResponse, responseError } from '@/lib/api/proxy';

interface Params {
  params: Promise<{ token: string }>;
}

/**
 * Streams a public share's ciphertext to the recipient browser, which alone can
 * decrypt it with the fragment key. Delivery is counted atomically by the API
 * before this stream starts.
 */
export async function GET(_request: Request, { params }: Params): Promise<Response> {
  try {
    const { token } = await params;
    const upstream = await apiFetchPublicStream(
      `/api/v1/public/shares/${encodeURIComponent(token)}/download`,
    );
    if (!upstream.ok || !upstream.body) {
      return await responseError(upstream);
    }

    const contentLength = upstream.headers.get('content-length');
    const format = upstream.headers.get('x-stackbase-format');
    const ciphertextHash = upstream.headers.get('x-stackbase-ciphertext-hash');
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'content-type': 'application/octet-stream',
        'cache-control': 'no-store',
        'referrer-policy': 'no-referrer',
        ...(contentLength ? { 'content-length': contentLength } : {}),
        ...(format ? { 'x-stackbase-format': format } : {}),
        ...(ciphertextHash ? { 'x-stackbase-ciphertext-hash': ciphertextHash } : {}),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
