import { errorResponse, forwardJson } from '@/lib/api/proxy';

interface Params {
  params: Promise<{ uploadId: string }>;
}

/** Cancels an in-flight job and removes its staging data server-side. */
export async function POST(_request: Request, { params }: Params): Promise<Response> {
  try {
    const { uploadId } = await params;
    return await forwardJson(`/api/v1/uploads/${encodeURIComponent(uploadId)}/cancel`, 'POST');
  } catch (error) {
    return errorResponse(error);
  }
}
