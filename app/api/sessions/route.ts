import { ConfigurationError, getAssistant } from "@/lib/server";
import { resolveVisitor, responseHeaders } from "@/lib/visitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const visitor = resolveVisitor(request);
  try {
    const sessions = await getAssistant().list({
      page: 1,
      pageSize: 50,
      metadata: { visitorId: visitor.id },
    });
    return Response.json(sessions, { headers: responseHeaders(visitor.setCookie) });
  } catch (error) {
    return Response.json(
      { error: error instanceof ConfigurationError ? error.message : "Conversations could not be loaded." },
      { status: error instanceof ConfigurationError ? 503 : 500 },
    );
  }
}
