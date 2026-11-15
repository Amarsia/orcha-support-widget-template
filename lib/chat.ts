export type ChatAttachment = {
  id?: string;
  name: string;
  mimeType: string;
  url?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
  pending?: boolean;
};

export type SessionSummary = {
  sessionId: string;
  name?: string;
  updatedAt: string;
};

export function contentToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return typeof part.text === "string" ? part.text : "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return value == null ? "" : JSON.stringify(value);
}
