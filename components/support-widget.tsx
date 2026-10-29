"use client";

import { ArrowLeft, ArrowUp, History, MessageCircle, Plus, X } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

import type { WidgetConfig, WidgetTheme } from "@/config/widget";
import { contentToText, type ChatMessage, type SessionSummary } from "@/lib/chat";

type Props = { config: WidgetConfig; initialTheme: WidgetTheme; parentOrigin?: string };
type StreamEvent = { type?: string; sessionId?: string; snapshot?: unknown; result?: unknown; error?: string };

function output(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const row = value as { status?: string; output?: unknown; error?: { message?: string } };
  if (row.status === "failed") throw new Error(row.error?.message || "Response failed.");
  return row.status === "streaming" || row.status === "completed" ? contentToText(row.output) : "";
}

export function SupportWidget({ config, initialTheme, parentOrigin }: Props) {
  const [theme, setTheme] = useState(initialTheme);
  const [sessionId, setSessionId] = useState<string>();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState(false);
  const [error, setError] = useState<string>();
  const endRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    if (theme === "system") root.removeAttribute("data-theme");
  }, [theme]);

  useEffect(() => {
    if (!parentOrigin || window.parent === window) return;
    window.parent.postMessage(
      { type: "orcha-support:ready", name: config.name, accent: config.accent },
      parentOrigin,
    );
  }, [config.accent, config.name, parentOrigin]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: sending ? "smooth" : "auto" });
  }, [messages, sending]);

  const newChat = () => {
    setSessionId(undefined);
    setMessages([]);
    setInput("");
    setError(undefined);
    setHistory(false);
  };

  const openSession = async (id: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json() as {
        items?: Array<{ id?: string; type?: string; role?: "user" | "assistant"; content?: unknown }>;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error);
      setMessages((data.items ?? []).flatMap((item) => item.type === "message" && item.role ? [{
        id: item.id || crypto.randomUUID(),
        role: item.role,
        content: contentToText(item.content),
      }] : []));
      setSessionId(id);
      setHistory(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this conversation.");
    } finally {
      setLoading(false);
    }
  };

  const send = async (raw: string) => {
    const message = raw.trim();
    if (!message || sending) return;
    const assistantId = crypto.randomUUID();
    setMessages((current) => [...current,
      { id: crypto.randomUUID(), role: "user", content: message },
      { id: assistantId, role: "assistant", content: "", pending: true },
    ]);
    setInput("");
    setError(undefined);
    setSending(true);
    const update = (content: string) => setMessages((current) => current.map((item) =>
      item.id === assistantId ? { ...item, content } : item,
    ));
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId }),
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
        if (item.type === "snapshot") {
          const text = output(item.snapshot);
          if (text) { final = text; update(text); }
        }
        if (item.type === "result") {
          const text = output(item.result);
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
      const text = reason instanceof Error ? reason.message : "Response failed.";
      setError(text);
      update(`Sorry, I couldn't complete that response. ${text}`);
    } finally {
      setMessages((current) => current.map((item) =>
        item.id === assistantId ? { ...item, pending: false } : item,
      ));
      setSending(false);
      void refresh();
    }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void send(input); };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); }
  };

  return (
    <main className="widget" style={{ "--accent": config.accent } as React.CSSProperties}>
      <header className="widget-header">
        <div className="widget-title">
          <span className="status-dot" aria-hidden="true" />
          <div><strong>{history ? "Conversations" : config.name}</strong><small>{history ? "Continue a previous chat" : "Online"}</small></div>
        </div>
        <div className="header-actions">
          {history ? (
            <button type="button" onClick={() => setHistory(false)} aria-label="Back to chat"><ArrowLeft /></button>
          ) : (
            <>
              <button type="button" onClick={newChat} aria-label="Start new chat"><Plus /></button>
              <button type="button" onClick={() => setHistory(true)} aria-label="View conversation history"><History /></button>
            </>
          )}
          {parentOrigin ? <button type="button" onClick={() => window.parent.postMessage({ type: "orcha-support:close" }, parentOrigin)} aria-label="Close chat"><X /></button> : null}
        </div>
      </header>

      {history ? (
        <section className="history-list" aria-label="Conversation history">
          <button type="button" className="new-chat" onClick={newChat}><Plus /> New conversation</button>
          {sessions.length ? sessions.map((session) => (
            <button type="button" key={session.sessionId} className="history-item" onClick={() => void openSession(session.sessionId)}>
              <MessageCircle /><span>{session.name || "Untitled conversation"}</span>
            </button>
          )) : <p className="empty-copy">No previous conversations yet.</p>}
        </section>
      ) : (
        <>
          <section className="messages" aria-live="polite" aria-busy={loading || sending}>
            {loading ? <div className="loading"><i /><i /><i /></div> : messages.length === 0 ? (
              <div className="welcome">
                <span className="welcome-icon"><MessageCircle /></span>
                <h1>{config.welcomeTitle}</h1>
                <p>{config.welcomeMessage}</p>
                <div className="suggestions">
                  {config.suggestedPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => void send(prompt)}>{prompt}</button>)}
                </div>
              </div>
            ) : (
              <div className="message-list">
                {messages.map((message) => message.role === "user" ? (
                  <div key={message.id} className="message user-message">{message.content}</div>
                ) : (
                  <div key={message.id} className="message assistant-message">
                    {message.content ? <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown> : <span className="typing"><i /><i /><i /></span>}
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            )}
          </section>
          <footer className="composer-wrap">
            {error ? <div className="error" role="alert">{error}</div> : null}
            <form className="composer" onSubmit={submit}>
              <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={keyDown} placeholder={config.placeholder} maxLength={10_000} rows={1} disabled={sending} aria-label={config.placeholder} />
              <button type="submit" disabled={!input.trim() || sending} aria-label="Send message"><ArrowUp /></button>
            </form>
            <div className="composer-meta">
              <button type="button" onClick={() => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light")} aria-label={`Theme: ${theme}`}>{theme}</button>
              <span>{config.disclaimer}</span>
            </div>
            {config.poweredBy ? <a className="powered" href={config.poweredBy.url} target="_blank" rel="noopener noreferrer">{config.poweredBy.label}</a> : null}
          </footer>
        </>
      )}
    </main>
  );
}
