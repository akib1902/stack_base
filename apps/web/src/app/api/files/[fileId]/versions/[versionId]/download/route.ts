import { apiFetchStream } from '@/lib/api/client';
import { errorResponse, responseError } from '@/lib/api/proxy';

interface Params {
  params: Promise<{ fileId: string; versionId: string }>;
}

/**
 * Streams one version's ciphertext to the browser, which decrypts it locally.
 * The response is piped rather than buffered so large files do not have to fit
 * in the server's memory, and nothing is cached on the way through.
 */
export async function GET(_request: Request, { params }: Params): Promise<Response> {
  try {
    const { fileId, versionId } = await params;
    const upstream = await apiFetchStream(
      `/api/v1/files/${encodeURIComponent(fileId)}/versions/${encodeURIComponent(versionId)}/download`,
    );
    if (!upstream.ok || !upstream.body) {
      return await responseError(upstream);
    }

    const contentLength = upstream.headers.get('content-length');
    const ciphertextHash = upstream.headers.get('x-stackbase-ciphertext-hash');
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'content-type': 'application/octet-stream',
        'cache-control': 'no-store',
        ...(contentLength ? { 'content-length': contentLength } : {}),
        ...(ciphertextHash ? { 'x-stackbase-ciphertext-hash': ciphertextHash } : {}),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
