"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type Props = {
  jsCode: string;
  iframeCode: string;
  accent: string;
};

export function EmbedSnippet({ jsCode, iframeCode, accent }: Props) {
  const [tab, setTab] = useState<"js" | "iframe">("js");
  const [copied, setCopied] = useState(false);

  const activeCode = tab === "js" ? jsCode : iframeCode;
  const lines = activeCode.split("\n");

  const copy = () => {
    void navigator.clipboard.writeText(activeCode).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div>
      <h2 className="text-[16px] font-semibold tracking-tight text-neutral-900">Embed code</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
        Add this snippet to any page where you want the widget to appear.
      </p>

      <div className="mt-4 flex items-center gap-5 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => { setTab("iframe"); setCopied(false); }}
          className={`relative pb-2.5 text-[13px] font-medium transition-colors ${
            tab === "iframe" ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-800"
          }`}
          style={tab === "iframe" ? { color: accent } : undefined}
        >
          iFrame
          {tab === "iframe" ? (
            <span
              className="absolute right-0 bottom-0 left-0 h-[2px] rounded-full"
              style={{ backgroundColor: accent }}
            />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => { setTab("js"); setCopied(false); }}
          className={`relative pb-2.5 text-[13px] font-medium transition-colors ${
            tab === "js" ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-800"
          }`}
          style={tab === "js" ? { color: accent } : undefined}
        >
          JS embed
          {tab === "js" ? (
            <span
              className="absolute right-0 bottom-0 left-0 h-[2px] rounded-full"
              style={{ backgroundColor: accent }}
            />
          ) : null}
        </button>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <button
          type="button"
          onClick={copy}
          aria-label="Copy embed code"
          className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white/95 px-2 py-1.5 text-[11px] font-medium text-neutral-600 shadow-xs backdrop-blur transition-colors hover:bg-neutral-50 hover:text-neutral-900"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : null}
        </button>

        <div className="overflow-x-auto py-3.5 pr-12 pl-0 font-mono text-[12px] leading-[1.65]">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, index) => (
                <tr key={index}>
                  <td className="w-10 border-r border-neutral-100 pr-3 pl-3 text-right text-[11px] text-neutral-400 select-none">
                    {index + 1}
                  </td>
                  <td className="pl-3.5 whitespace-pre text-neutral-800">{line || " "}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
