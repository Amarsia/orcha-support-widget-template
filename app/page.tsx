import { widgetConfig } from "@/config/widget";

const snippet = `<script
  src="https://support.example.com/embed.js"
  data-base-url="https://support.example.com"
  data-position="bottom-right"
  data-width="400"
  data-height="600"
  data-theme="system"
  async
></script>`;

export default function HomePage() {
  return (
    <main className="preview-page">
      <section className="preview-copy">
        <span className="eyebrow">OrchaJS support widget</span>
        <h1>A self-hosted support assistant for any website.</h1>
        <p>
          This page previews the production iframe. Customize copy and branding in{" "}
          <code>config/widget.ts</code>, then deploy and paste the snippet into your site.
        </p>
        <div className="feature-list">
          <span>Server-side OrchaJS</span>
          <span>Streaming responses</span>
          <span>Private durable history</span>
          <span>No deployment ID</span>
        </div>
        <h2>Embed it</h2>
        <pre className="embed-code"><code>{snippet}</code></pre>
        <p className="preview-note">
          Replace <code>https://support.example.com</code> with your deployment URL.
          Restrict iframe hosts with <code>WIDGET_ALLOWED_ORIGINS</code> in production.
        </p>
      </section>
      <section className="phone-preview" aria-label={`${widgetConfig.name} preview`}>
        <iframe title={`${widgetConfig.name} preview`} src="/widget?theme=system" />
      </section>
    </main>
  );
}
