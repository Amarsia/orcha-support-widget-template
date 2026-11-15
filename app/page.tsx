import { headers } from "next/headers";

import { EmbedSnippet } from "@/components/embed-snippet";
import { SupportWidget } from "@/components/support-widget";
import { widgetConfig } from "@/config/widget";

function requestOrigin(headerStore: Headers): string {
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) return "";
  const forwarded = headerStore.get("x-forwarded-proto");
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = forwarded ?? (local ? "http" : "https");
  return `${proto}://${host}`;
}

function jsEmbedSnippet(origin: string): string {
  const src = origin ? `${origin}/embed.js` : "/embed.js";
  const baseLine = origin ? `\n    baseUrl: "${origin}",` : "";
  return `<script src="${src}" data-auto-init="false"></script>
<script>
  window.OrchaSupport.init({${baseLine}
    position: "bottom-right",
    width: 400,
    height: 600,
    theme: "${widgetConfig.theme}"
  });
</script>`;
}

function iframeEmbedSnippet(origin: string): string {
  const src = origin ? `${origin}/widget` : "/widget";
  return `<iframe
  src="${src}"
  width="400"
  height="600"
  style="border:0; min-height:480px; min-width:340px; border-radius:16px;"
  allow="clipboard-read; clipboard-write"
  title="${widgetConfig.name}"
></iframe>`;
}

export default async function HomePage() {
  const origin = requestOrigin(await headers());

  return (
    <main className="flex min-h-dvh flex-col bg-[#f6f6f6] lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col justify-between border-b border-neutral-200/80 bg-white px-6 py-8 lg:w-[440px] lg:border-r lg:border-b-0 lg:px-8 lg:py-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={widgetConfig.icon} alt={widgetConfig.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[17px] font-semibold tracking-tight text-neutral-900">
                {widgetConfig.name}
              </h1>
              <p className="truncate text-[12.5px] text-neutral-500">{widgetConfig.description}</p>
            </div>
          </div>

          <div className="mt-8 border-t border-neutral-100 pt-7">
            <EmbedSnippet
              jsCode={jsEmbedSnippet(origin)}
              iframeCode={iframeEmbedSnippet(origin)}
              accent={widgetConfig.accent}
            />
          </div>
        </div>

        <p className="mt-8 text-[12px] text-neutral-400">
          Customize name, icon, accent, and prompts in <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600">config/widget.ts</code>.
        </p>
      </aside>

      <section className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="h-[min(680px,calc(100dvh-64px))] w-[min(400px,100%)] min-h-[480px] overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
          <SupportWidget config={widgetConfig} />
        </div>
      </section>
    </main>
  );
}
