import { errorResponse, forwardJson } from '@/lib/api/proxy';

interface Params {
  params: Promise<{ fileId: string; versionId: string }>;
}

/**
 * Restores an old version by appending a new one that points at the same
 * ciphertext; the original history stays intact.
 */
export async function POST(_request: Request, { params }: Params): Promise<Response> {
  try {
    const { fileId, versionId } = await params;
    return await forwardJson(
      `/api/v1/files/${encodeURIComponent(fileId)}/versions/${encodeURIComponent(versionId)}/restore`,
      'POST',
    );
  } catch (error) {
    return errorResponse(error);
  }
}
