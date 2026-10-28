import { errorResponse, forwardJson } from '@/lib/api/proxy';

interface Params {
  params: Promise<{ shareId: string }>;
}

/** Revokes a link server-side; already-downloaded copies cannot be recalled. */
export async function POST(_request: Request, { params }: Params): Promise<Response> {
  try {
    const { shareId } = await params;
    return await forwardJson(
      `/api/v1/shares/${encodeURIComponent(shareId)}/revoke`,
      'POST',
    );
  } catch (error) {
    return errorResponse(error);
  }
}
