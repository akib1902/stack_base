import { errorResponse, forwardJson } from '@/lib/api/proxy';

interface Params {
  params: Promise<{ fileId: string }>;
}

/** Version metadata (manifests included) is what the browser needs to decrypt. */
export async function GET(_request: Request, { params }: Params): Promise<Response> {
  try {
    const { fileId } = await params;
    return await forwardJson(
      `/api/v1/files/${encodeURIComponent(fileId)}/versions`,
      'GET',
    );
  } catch (error) {
    return errorResponse(error);
  }
}
