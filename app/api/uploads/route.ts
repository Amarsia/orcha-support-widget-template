import { consumeRateLimit } from "@/lib/rate-limit";
import { saveVisitorUpload, UploadError } from "@/lib/uploads";
import { resolveVisitor, responseHeaders } from "@/lib/visitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const visitor = resolveVisitor(request);
  const rate = consumeRateLimit(visitor.id);
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many uploads. Please wait a moment." },
      { status: 429, headers: responseHeaders(visitor.setCookie) },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Expected multipart/form-data request." },
      { status: 400, headers: responseHeaders(visitor.setCookie) },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { error: "No file provided." },
      { status: 400, headers: responseHeaders(visitor.setCookie) },
    );
  }

  try {
    const meta = await saveVisitorUpload(visitor.id, file);
    return Response.json(
      {
        id: meta.id,
        name: meta.name,
        mimeType: meta.mimeType,
        size: meta.size,
        url: `/api/uploads/${encodeURIComponent(meta.id)}`,
      },
      { headers: responseHeaders(visitor.setCookie) },
    );
  } catch (error) {
    const status = error instanceof UploadError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not upload file.";
    return Response.json({ error: message }, { status, headers: responseHeaders(visitor.setCookie) });
  }
}
