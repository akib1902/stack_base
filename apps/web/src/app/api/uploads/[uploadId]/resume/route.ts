import { errorResponse, forwardJson } from '@/lib/api/proxy';

interface Params {
  params: Promise<{ uploadId: string }>;
}

/** Reopens a paused job; no chunk is resent and nothing is lost. */
export async function POST(_request: Request, { params }: Params): Promise<Response> {
  try {
    const { uploadId } = await params;
    return await forwardJson(`/api/v1/uploads/${encodeURIComponent(uploadId)}/resume`, 'POST');
  } catch (error) {
    return errorResponse(error);
  }
}
