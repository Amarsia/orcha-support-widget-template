import type { AgentContentInput, MessageContentInput } from "orchajs";

import { consumeRateLimit } from "@/lib/rate-limit";
import { ConfigurationError, getAssistant } from "@/lib/server";
import { resolveVisitorUpload, UploadError } from "@/lib/uploads";
import { resolveVisitor, responseHeaders } from "@/lib/visitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const encoder = new TextEncoder();
const event = (value: unknown) => encoder.encode(`${JSON.stringify(value)}\n`);

type AttachmentInput = { id?: unknown };

export async function POST(request: Request): Promise<Response> {
  const visitor = resolveVisitor(request);
  const rate = consumeRateLimit(visitor.id);
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many messages. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  let body: { message?: unknown; sessionId?: unknown; attachments?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const rawAttachments = Array.isArray(body.attachments) ? (body.attachments as AttachmentInput[]) : [];

  if (message.length > 10_000) {
    return Response.json({ error: "Message must be at most 10,000 characters." }, { status: 400 });
  }
  if (rawAttachments.length > 10) {
    return Response.json({ error: "At most 10 attachments can be sent per message." }, { status: 400 });
  }
  if (!message && rawAttachments.length === 0) {
    return Response.json({ error: "Please enter a message or attach a file." }, { status: 400 });
  }

  try {
    const contentItems: MessageContentInput[] = [];
    let firstFileName = "";

    for (const item of rawAttachments) {
      const id = typeof item?.id === "string" ? item.id.trim() : "";
      if (!id) {
        return Response.json({ error: "Invalid attachment reference." }, { status: 400 });
      }
      const { meta, filePath } = await resolveVisitorUpload(visitor.id, id);
      if (!firstFileName) firstFileName = meta.name;
      contentItems.push({
        type: "file",
        filePath,
        mimeType: meta.mimeType,
      });
    }

    if (message) {
      contentItems.push({ type: "text", text: message });
    }

    const content: AgentContentInput =
      rawAttachments.length === 0 && message ? message : contentItems;

    const assistant = getAssistant();
    if (sessionId) {
      const session = await assistant.get(sessionId);
      if (session.metadata.visitorId !== visitor.id) {
        return Response.json({ error: "Conversation not found." }, { status: 404 });
      }
    }

    const sessionLabelSource = message || `Attachment: ${firstFileName}`;
    const execution = sessionId
      ? assistant.resume(sessionId, { content })
      : assistant.run({
          content,
          name: sessionLabelSource.length > 52 ? `${sessionLabelSource.slice(0, 49)}…` : sessionLabelSource,
          metadata: { visitorId: visitor.id },
        });

    let closed = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const write = (value: unknown) => { if (!closed) controller.enqueue(event(value)); };
        write({ type: "session", sessionId: execution.sessionId });
        void (async () => {
          try {
            for await (const snapshot of execution.stream) write({ type: "snapshot", snapshot });
            write({ type: "result", result: await execution.result });
          } catch (error) {
            write({ type: "error", error: error instanceof Error ? error.message : "Response failed." });
          } finally {
            if (!closed) controller.close();
          }
        })();
      },
      cancel() { closed = true; },
    });
    return new Response(stream, {
      headers: responseHeaders(visitor.setCookie, "application/x-ndjson; charset=utf-8"),
    });
  } catch (error) {
    if (error instanceof UploadError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: error instanceof ConfigurationError ? error.message : "The assistant could not be started." },
      { status: error instanceof ConfigurationError ? 503 : 500 },
    );
  }
}
