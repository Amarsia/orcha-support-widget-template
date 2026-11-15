import { readFile } from "node:fs/promises";

import { resolveVisitorUpload, UploadError } from "@/lib/uploads";
import { resolveVisitor, responseHeaders } from "@/lib/visitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
): Promise<Response> {
  const { fileId } = await params;
  const visitor = resolveVisitor(request);

  try {
    const { meta, filePath } = await resolveVisitorUpload(visitor.id, fileId);
    const bytes = await readFile(filePath);
    const headers = responseHeaders(visitor.setCookie, meta.mimeType);
    const encodedName = encodeURIComponent(meta.name);
    headers.set("Content-Disposition", `inline; filename*=UTF-8''${encodedName}`);
    headers.set("Content-Length", String(bytes.byteLength));
    return new Response(bytes, { headers });
  } catch (error) {
    const status = error instanceof UploadError ? error.status : 404;
    const message = error instanceof Error ? error.message : "Attachment not found.";
    return Response.json({ error: message }, { status, headers: responseHeaders(visitor.setCookie) });
  }
}
