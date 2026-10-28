import type { ShareListResponse } from '@stackbase/contracts';
import { apiFetch } from '@/lib/api/client';
import { errorResponse, forwardJson } from '@/lib/api/proxy';

/**
 * Owner share endpoints. The browser posts the share-wrapped key here; the raw
 * fragment secret never reaches this handler because it lives only in the URL
 * hash of the generated link.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const fileId = new URL(request.url).searchParams.get('fileId');
    const query = fileId ? `?fileId=${encodeURIComponent(fileId)}` : '';
    const data = await apiFetch<ShareListResponse>(`/api/v1/shares${query}`);
    return Response.json(data, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as unknown;
    return await forwardJson('/api/v1/shares', 'POST', body);
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
