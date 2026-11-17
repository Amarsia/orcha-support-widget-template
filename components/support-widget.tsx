"use client";

import {
  ArrowLeft,
  Check,
  FileText,
  History,
  Image as ImageIcon,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type HTMLAttributes,
} from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { WidgetConfig } from "@/config/widget";
import { contentToText, type ChatAttachment, type ChatMessage, type SessionSummary } from "@/lib/chat";

type Props = { config: WidgetConfig; parentOrigin?: string };
type StreamEvent = { type?: string; sessionId?: string; snapshot?: unknown; result?: unknown; error?: string };

type PendingAttachment = {
  localId: string;
  id?: string;
  name: string;
  mimeType: string;
  url?: string;
  uploading: boolean;
  error?: string;
};

const markdownComponents: Record<string, ComponentType<HTMLAttributes<HTMLElement>>> = {
  p: ({ children, ...props }) => <p className="mb-2.5 leading-relaxed last:mb-0" {...props}>{children}</p>,
  ul: ({ children, ...props }) => <ul className="mb-2.5 ml-5 list-disc space-y-1 last:mb-0" {...props}>{children}</ul>,
  ol: ({ children, ...props }) => <ol className="mb-2.5 ml-5 list-decimal space-y-1 last:mb-0" {...props}>{children}</ol>,
  li: ({ children, ...props }) => <li className="leading-relaxed" {...props}>{children}</li>,
  code: ({ className, children, ...props }) => {
    if (className?.includes("language-")) {
      return (
        <pre className="my-3 overflow-x-auto rounded-xl bg-[var(--text-primary)] px-4 py-3.5 text-[13px] text-[var(--bg-page)]">
          <code className={className} {...props}>{children}</code>
        </pre>
      );
    }
    return <code className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[12.5px] text-[var(--text-secondary)]" {...props}>{children}</code>;
  },
  pre: ({ children, ...props }) => <div {...props}>{children}</div>,
  a: ({ children, ...props }) => (
    <a className="text-[var(--interactive-primary)] underline underline-offset-2 hover:no-underline" target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
  strong: ({ children, ...props }) => <strong className="font-semibold" {...props}>{children}</strong>,
  h1: ({ children, ...props }) => <h1 className="mt-4 mb-2.5 text-lg font-semibold first:mt-0" {...props}>{children}</h1>,
  h2: ({ children, ...props }) => <h2 className="mt-3.5 mb-2 text-base font-semibold first:mt-0" {...props}>{children}</h2>,
  h3: ({ children, ...props }) => <h3 className="mt-3 mb-1.5 text-[15px] font-semibold first:mt-0" {...props}>{children}</h3>,
  blockquote: ({ children, ...props }) => (
    <blockquote className="my-3 border-l-2 border-[var(--interactive-primary)] pl-4 text-[var(--text-secondary)] italic" {...props}>
      {children}
    </blockquote>
  ),
  table: ({ children, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-[var(--border-default)]">
      <table className="w-full border-collapse text-left text-[12.5px]" {...props}>{children}</table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 font-semibold" {...props}>{children}</th>
  ),
  td: ({ children, ...props }) => (
    <td className="border-b border-[var(--border-default)] px-3 py-2 align-top" {...props}>{children}</td>
  ),
  hr: (props) => <hr className="my-4 border-0 border-t border-[var(--border-default)]" {...props} />,
};

function output(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const row = value as { status?: string; output?: unknown; error?: { message?: string } };
  if (row.status === "failed") throw new Error(row.error?.message || "Response failed.");
  return row.status === "streaming" || row.status === "completed" ? contentToText(row.output) : "";
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function WidgetLogo({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}

function AttachmentList({ attachments, align }: { attachments: ChatAttachment[]; align: "end" | "start" }) {
  if (attachments.length === 0) return null;
  return (
    <div className={`mb-2 flex flex-wrap gap-2 ${align === "end" ? "justify-end" : "justify-start"}`}>
      {attachments.map((file, idx) => {
        const isImage = file.mimeType.startsWith("image/");
        if (isImage && file.url && align === "start") {
          return (
            <a
              key={`${file.url}-${idx}`}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="overflow-hidden rounded-xl border border-[var(--border-default)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={file.url} alt={file.name} className="max-h-56 w-auto max-w-full object-contain" />
            </a>
          );
        }
        const chipContent = (
          <>
            {isImage ? <ImageIcon className="h-3.5 w-3.5 shrink-0" /> : <FileText className="h-3.5 w-3.5 shrink-0" />}
            <span className="max-w-[140px] truncate">{file.name}</span>
          </>
        );
        return file.url ? (
          <a
            key={`${file.url}-${idx}`}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-raised)] px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
          >
            {chipContent}
          </a>
        ) : (
          <span
            key={`${file.name}-${idx}`}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-raised)] px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)]"
          >
            {chipContent}
          </span>
        );
      })}
    </div>
  );
}

export function SupportWidget({ config, parentOrigin }: Props) {
  const [sessionId, setSessionId] = useState<string>();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [input, setInput] = useState("");
  const [opening, setOpening] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState(false);
  const [error, setError] = useState<string>();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resize = useCallback(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 160)}px`;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/sessions", { cache: "no-store" });
      const data = await response.json() as { items?: SessionSummary[]; error?: string };
      if (!response.ok) throw new Error(data.error);
      setSessions(data.items ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load conversations.");
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    document.documentElement.style.setProperty("--interactive-primary", config.accent);
  }, [config.accent]);

  useEffect(() => {
    if (!parentOrigin || window.parent === window) return;
    window.parent.postMessage(
      {
        type: "orcha-support:ready",
        name: config.name,
        accent: config.accent,
        icon: config.icon,
        launcherLabel: config.launcherLabel,
      },
      parentOrigin,
    );
  }, [config.accent, config.icon, config.launcherLabel, config.name, parentOrigin]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: sending ? "smooth" : "auto" });
  }, [messages, sending]);

  const newChat = () => {
    setSessionId(undefined);
    setMessages([]);
    setAttachments([]);
    setInput("");
    setError(undefined);
    setHistory(false);
  };

  const openSession = async (id: string) => {
    setOpening(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json() as {
        items?: Array<{ id?: string; type?: string; role?: "user" | "assistant"; content?: unknown; attachments?: ChatAttachment[] }>;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error);
      setMessages((data.items ?? []).flatMap((item) => item.type === "message" && item.role ? [{
        id: item.id || crypto.randomUUID(),
        role: item.role,
        content: contentToText(item.content),
        attachments: item.attachments,
      }] : []));
      setSessionId(id);
      setAttachments([]);
      setHistory(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this conversation.");
    } finally {
      setOpening(false);
    }
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    setError(undefined);

    for (const file of files) {
      const localId = crypto.randomUUID();
      setAttachments((current) => [
        ...current,
        {
          localId,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          uploading: true,
        },
      ]);

      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        });
        const data = await response.json() as {
          id?: string;
          name?: string;
          mimeType?: string;
          url?: string;
          error?: string;
        };
        if (!response.ok || !data.id) {
          throw new Error(data.error || "Upload failed.");
        }
        setAttachments((current) =>
          current.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  id: data.id,
                  name: data.name || item.name,
                  mimeType: data.mimeType || item.mimeType,
                  url: data.url,
                  uploading: false,
                }
              : item,
          ),
        );
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Upload failed.";
        setAttachments((current) =>
          current.map((item) =>
            item.localId === localId ? { ...item, uploading: false, error: message } : item,
          ),
        );
      }
    }
  };

  const removeAttachment = (localId: string) => {
    setAttachments((current) => current.filter((item) => item.localId !== localId));
  };

  const readyAttachments = attachments.filter((item) => item.id && !item.uploading && !item.error);
  const hasUploading = attachments.some((item) => item.uploading);
  const canSend = (input.trim().length > 0 || readyAttachments.length > 0) && !sending && !hasUploading;

  const send = async (raw: string) => {
    const message = raw.trim();
    if ((!message && readyAttachments.length === 0) || sending || hasUploading) return;

    const attachmentsToSend: ChatAttachment[] = readyAttachments.map((item) => ({
      id: item.id,
      name: item.name,
      mimeType: item.mimeType,
      url: item.url,
    }));

    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      },
      { id: assistantId, role: "assistant", content: "", pending: true },
    ]);
    setInput("");
    setAttachments([]);
    if (inputRef.current) inputRef.current.style.height = "auto";
    setError(undefined);
    setSending(true);
    const update = (content: string) => setMessages((current) => current.map((item) =>
      item.id === assistantId ? { ...item, content } : item,
    ));
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          sessionId,
          attachments: attachmentsToSend.map((item) => ({ id: item.id })),
        }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || "Support is unavailable.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let final = "";
      const handle = (item: StreamEvent) => {
        if (item.type === "session" && item.sessionId) setSessionId(item.sessionId);
        if (item.type === "snapshot" || item.type === "result") {
          const text = output(item.type === "snapshot" ? item.snapshot : item.result);
          if (text) { final = text; update(text); }
        }
        if (item.type === "error") throw new Error(item.error || "Response failed.");
      };
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) if (line.trim()) handle(JSON.parse(line) as StreamEvent);
        if (done) break;
      }
      if (buffer.trim()) handle(JSON.parse(buffer) as StreamEvent);
      if (!final) throw new Error("The assistant returned an empty response.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Response failed.");
      setMessages((current) => current.filter((item) => item.id !== assistantId));
    } finally {
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, pending: false } : item));
      setSending(false);
      void refresh();
    }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void send(input); };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); }
  };

  const activeName = sessions.find((session) => session.sessionId === sessionId)?.name;
  const headerTitle = history ? "Previous conversations" : (activeName ?? config.name);
  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col bg-white" style={{ "--interactive-primary": config.accent } as React.CSSProperties}>
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-neutral-100 px-5">
        <div className="flex min-w-0 items-center gap-2">
          {history ? (
            <button type="button" onClick={() => setHistory(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5">
              <WidgetLogo src={config.icon} alt={config.name} className="h-full w-full object-cover" />
            </div>
          )}
          <h2 className="truncate text-[14px] font-semibold text-neutral-900">{headerTitle}</h2>
        </div>
        {history ? null : (
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={newChat} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700">
              <Sparkles className="h-3.5 w-3.5" />
              New
            </button>
            <button type="button" onClick={() => setHistory(true)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700">
              <History className="h-3.5 w-3.5" />
              History
            </button>
          </div>
        )}
      </div>

      {history ? (
        <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-3">
          <button type="button" onClick={newChat} className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New Chat
          </button>
          {sessions.length ? (
            <div className="space-y-0.5">
              {sessions.map((session) => (
                <button
                  key={session.sessionId}
                  type="button"
                  onClick={() => void openSession(session.sessionId)}
                  className={`flex w-full items-start rounded-lg px-3 py-2 text-left transition-colors ${session.sessionId === sessionId ? "bg-neutral-200/60 text-neutral-900" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] leading-snug font-medium">{session.name || "Untitled conversation"}</p>
                    <p className="mt-0.5 text-[10.5px] text-neutral-400">{formatDate(session.updatedAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <p className="text-[13px] font-medium text-neutral-500">No conversations yet</p>
              <p className="text-[11px] text-neutral-400">Your chats will appear here</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {opening ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
            </div>
          ) : empty ? (
            <div className="flex flex-1 flex-col overflow-hidden px-5">
              <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/8">
                  <WidgetLogo src={config.icon} alt={config.name} className="h-full w-full object-cover" />
                </div>
                <h1 className="text-[20px] font-semibold tracking-tight text-neutral-900">{config.name}</h1>
                <p className="mt-2 max-w-[260px] text-[13.5px] leading-relaxed text-neutral-500">{config.description}</p>
              </div>
              {config.suggestedPrompts.length > 0 ? (
                <div className="shrink-0 space-y-1.5 pb-3">
                  {config.suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => { setInput(prompt); requestAnimationFrame(resize); }}
                      className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-[13px] font-medium text-neutral-700 transition-all hover:shadow-sm"
                      style={{
                        background: "color-mix(in srgb, var(--interactive-primary) 8%, white)",
                        border: "1px solid color-mix(in srgb, var(--interactive-primary) 18%, white)",
                      }}
                    >
                      <span>{prompt}</span>
                      <span className="ml-3 shrink-0 text-[13px] text-neutral-300">↗</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="no-scrollbar flex-1 overflow-y-auto">
              <div className="space-y-5 px-5 py-5">
                {messages.map((message) => message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[75%]">
                      {message.attachments ? <AttachmentList attachments={message.attachments} align="end" /> : null}
                      {message.content ? (
                        <div className="rounded-2xl rounded-br-md px-4 py-3 shadow-sm" style={{ border: "1px solid color-mix(in srgb, var(--interactive-primary) 25%, white)", background: "color-mix(in srgb, var(--interactive-primary) 10%, white)" }}>
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-[var(--text-primary)]">{message.content}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : message.pending && !message.content ? (
                  <div key={message.id} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border-default)] bg-[var(--bg-raised)] shadow-sm">
                      <WidgetLogo src={config.icon} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-[var(--bg-subtle)] px-4 py-3">
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--text-tertiary)]" />
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--text-tertiary)] [animation-delay:150ms]" />
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--text-tertiary)] [animation-delay:300ms]" />
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border-default)] bg-[var(--bg-raised)] shadow-sm">
                      <WidgetLogo src={config.icon} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-[var(--text-primary)]">
                      {message.attachments ? <AttachmentList attachments={message.attachments} align="start" /> : null}
                      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{message.content}</Markdown>
                      {message.pending ? <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[var(--interactive-primary)]" /> : null}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            </div>
          )}

          <div className="shrink-0 px-4 pt-2 pb-3">
            {error ? <div className="mb-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</div> : null}

            {attachments.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-1.5 px-1">
                {attachments.map((file) => (
                  <div
                    key={file.localId}
                    title={file.error}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${
                      file.error
                        ? "border-red-200 bg-red-50 text-red-700"
                        : file.id
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-neutral-200 bg-neutral-50 text-neutral-600"
                    }`}
                  >
                    <span className="max-w-[110px] truncate">{file.name}</span>
                    {file.uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {file.id && !file.uploading ? <Check className="h-3 w-3" /> : null}
                    {file.error ? <span aria-label={file.error}>!</span> : null}
                    <button
                      type="button"
                      onClick={() => removeAttachment(file.localId)}
                      disabled={file.uploading}
                      aria-label={`Remove ${file.name}`}
                      className="ml-0.5 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100 disabled:cursor-not-allowed"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {config.allowFileUploads ? (
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
              />
            ) : null}

            <form onSubmit={submit} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow focus-within:border-neutral-300 focus-within:shadow-md">
              <div className="flex items-center gap-2 px-3.5 py-3">
                <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--interactive-primary)" }} />
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => { setInput(event.target.value); resize(); }}
                  onKeyDown={keyDown}
                  placeholder={config.placeholder}
                  disabled={sending}
                  rows={1}
                  maxLength={10_000}
                  aria-label={config.placeholder}
                  className="min-h-[22px] w-full resize-none bg-transparent text-[13.5px] leading-relaxed text-neutral-900 placeholder-neutral-400 outline-none disabled:opacity-50"
                />
              </div>
              <div className="mx-3.5 border-t border-neutral-100" />
              <div className="flex items-center justify-between px-3 py-2">
                {config.allowFileUploads ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                    aria-label="Attach file"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-50"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                ) : <span />}
                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label="Send"
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-all ${canSend ? "bg-[var(--interactive-primary)] text-white hover:opacity-90 active:scale-95" : "bg-neutral-100 text-neutral-300"}`}
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            </form>
          </div>

          {config.poweredBy ? (
            <div className="flex shrink-0 items-center justify-center gap-1.5 pb-2.5 text-[10px] text-neutral-400">
              Powered by
              <a href={config.poweredBy.url} target="_blank" rel="noopener noreferrer" className="font-medium text-neutral-500 transition-opacity hover:opacity-80">
                OrchaJS
              </a>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
