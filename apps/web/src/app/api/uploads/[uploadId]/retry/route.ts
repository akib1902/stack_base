import { errorResponse, forwardJson } from '@/lib/api/proxy';

interface Params {
  params: Promise<{ uploadId: string }>;
}

/** Flips a failed or source-less job back into an accepting state. */
export async function POST(_request: Request, { params }: Params): Promise<Response> {
  try {
    const { uploadId } = await params;
    return await forwardJson(`/api/v1/uploads/${encodeURIComponent(uploadId)}/retry`, 'POST');
  } catch (error) {
    return errorResponse(error);
  }
}
