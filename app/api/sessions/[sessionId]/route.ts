import { ConfigurationError, getAssistant } from "@/lib/server";
import { resolveVisitor, responseHeaders } from "@/lib/visitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await params;
  if (!/^ses_[\w-]+$/.test(sessionId)) {
    return Response.json({ error: "Invalid conversation ID." }, { status: 400 });
  }
  const visitor = resolveVisitor(request);
  try {
    const assistant = getAssistant();
    const session = await assistant.get(sessionId);
    if (session.metadata.visitorId !== visitor.id) {
      return Response.json({ error: "Conversation not found." }, { status: 404 });
    }
    const history = await assistant.history(sessionId, { page: 1, pageSize: 200 });
    return Response.json(history, { headers: responseHeaders(visitor.setCookie) });
  } catch (error) {
    return Response.json(
      { error: error instanceof ConfigurationError ? error.message : "Conversation could not be loaded." },
      { status: error instanceof ConfigurationError ? 503 : 404 },
    );
  }
}
