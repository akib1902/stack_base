import { UPLOAD_CHUNK_CHECKSUM_HEADER, UPLOAD_CHUNK_CONTENT_TYPE } from '@stackbase/contracts';
import { errorResponse, forwardBinary } from '@/lib/api/proxy';

interface Params {
  params: Promise<{ uploadId: string; chunkNumber: string }>;
}

/** One encrypted chunk; ciphertext only, bounds enforced by the API. */
export async function PUT(request: Request, { params }: Params): Promise<Response> {
  try {
    const { uploadId, chunkNumber } = await params;
    const checksum = request.headers.get(UPLOAD_CHUNK_CHECKSUM_HEADER);
    if (!checksum) {
      return Response.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `The ${UPLOAD_CHUNK_CHECKSUM_HEADER} header is required.`,
          },
        },
        { status: 400 },
      );
    }

    const body = await request.arrayBuffer();
    return await forwardBinary(
      `/api/v1/uploads/${encodeURIComponent(uploadId)}/chunks/${encodeURIComponent(chunkNumber)}`,
      'PUT',
      body,
      {
        'content-type': UPLOAD_CHUNK_CONTENT_TYPE,
        [UPLOAD_CHUNK_CHECKSUM_HEADER]: checksum,
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
