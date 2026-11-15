import type { ChatAttachment } from "@/lib/chat";
import { ConfigurationError, getAssistant } from "@/lib/server";
import { attachmentFromStoredFilePath } from "@/lib/uploads";
import { resolveVisitor, responseHeaders } from "@/lib/visitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HistoryContentPart = {
  type?: string;
  text?: string;
  filePath?: string;
  fileUri?: string;
  mimeType?: string;
};

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

    const items = await Promise.all(
      (history.items ?? []).map(async (item) => {
        if (item.type !== "message" || !Array.isArray(item.content)) return item;
        const attachments: ChatAttachment[] = [];
        const textParts: HistoryContentPart[] = [];

        for (const rawPart of item.content as HistoryContentPart[]) {
          if (!rawPart || typeof rawPart !== "object") continue;
          if (rawPart.type === "file" && typeof rawPart.filePath === "string") {
            attachments.push(
              await attachmentFromStoredFilePath(
                visitor.id,
                rawPart.filePath,
                typeof rawPart.mimeType === "string" ? rawPart.mimeType : "application/octet-stream",
              ),
            );
          } else if (
            (rawPart.type === "image" || rawPart.type === "url") &&
            typeof rawPart.fileUri === "string"
          ) {
            attachments.push({
              name: rawPart.fileUri.split("/").pop() || "Attachment",
              mimeType: typeof rawPart.mimeType === "string" ? rawPart.mimeType : "application/octet-stream",
              url: rawPart.fileUri,
            });
          } else {
            textParts.push(rawPart);
          }
        }

        return {
          ...item,
          content: textParts,
          ...(attachments.length > 0 ? { attachments } : {}),
        };
      }),
    );

    return Response.json({ ...history, items }, { headers: responseHeaders(visitor.setCookie) });
  } catch (error) {
    return Response.json(
      { error: error instanceof ConfigurationError ? error.message : "Conversation could not be loaded." },
      { status: error instanceof ConfigurationError ? 503 : 404 },
    );
  }
}
