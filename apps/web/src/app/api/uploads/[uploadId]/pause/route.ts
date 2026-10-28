import { errorResponse, forwardJson } from '@/lib/api/proxy';

interface Params {
  params: Promise<{ uploadId: string }>;
}

/** Stops chunk intake but keeps the job and every chunk that already arrived. */
export async function POST(_request: Request, { params }: Params): Promise<Response> {
  try {
    const { uploadId } = await params;
    return await forwardJson(`/api/v1/uploads/${encodeURIComponent(uploadId)}/pause`, 'POST');
  } catch (error) {
    return errorResponse(error);
  }
}
