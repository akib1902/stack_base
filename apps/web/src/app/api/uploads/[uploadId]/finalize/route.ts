import { errorResponse, forwardJson } from '@/lib/api/proxy';

interface Params {
  params: Promise<{ uploadId: string }>;
}

/** Declares the two hashes computed while streaming; the API verifies them. */
export async function POST(request: Request, { params }: Params): Promise<Response> {
  try {
    const { uploadId } = await params;
    const body = (await request.json()) as unknown;
    return await forwardJson(
      `/api/v1/uploads/${encodeURIComponent(uploadId)}/finalize`,
      'POST',
      body,
    );
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
