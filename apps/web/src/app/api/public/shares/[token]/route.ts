import type { PublicShare } from '@stackbase/contracts';
import { apiFetchPublic } from '@/lib/api/client';
import { errorResponse } from '@/lib/api/proxy';

interface Params {
  params: Promise<{ token: string }>;
}

/**
 * Public metadata for a share link. No session is involved: the 43-character
 * token in the path is the capability. The fragment key is never here.
 */
export async function GET(_request: Request, { params }: Params): Promise<Response> {
  try {
    const { token } = await params;
    const data = await apiFetchPublic<PublicShare>(
      `/api/v1/public/shares/${encodeURIComponent(token)}`,
    );
    return Response.json(data, {
      headers: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
