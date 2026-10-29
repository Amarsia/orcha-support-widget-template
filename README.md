# Orcha Support Widget Template

A standalone, self-hosted support chat widget built with Next.js 16.4.3 and server-side [OrchaJS](https://github.com/Amarsia/orcha). Provider credentials never reach the browser, and no deployment ID or Amarsia SDK is required.

## Features

- Embeddable launcher and responsive iframe UI
- Streaming NDJSON responses from server-side OrchaJS
- Signed HttpOnly visitor isolation and durable conversation history
- New chat, restart, history, loading, empty, and error states
- Light, dark, and system themes with reduced-motion support
- Configurable position, dimensions, theme, and deployment base URL
- Single-container in-memory rate limiting
- CSP `frame-ancestors` controls and strict `postMessage` origin checks
- Docker standalone output with persistent session storage

## Setup

```bash
npm install
cp .env.example .env.local
```

Set `OPENAI_API_KEY` and generate a unique `VISITOR_COOKIE_SECRET` of at least 32 characters. Customize the product-facing widget in `config/widget.ts`, and the agent in `orcha/assistant/`.

```bash
npm run dev
```

Open `http://localhost:3000` for the host preview or `http://localhost:3000/widget` for the iframe route.

## Embed

Replace both example origins with your deployed widget origin:

```html
<script
  src="https://support.example.com/embed.js"
  data-base-url="https://support.example.com"
  data-position="bottom-right"
  data-width="400"
  data-height="600"
  data-theme="system"
  async
></script>
```

The script derives its origin from its own `src` if `data-base-url` is omitted. To initialize manually, add `data-auto-init="false"` and call:

```html
<script>
  window.OrchaSupport.init({
    baseUrl: "https://support.example.com",
    position: "bottom-left",
    width: 400,
    height: 600,
    theme: "system"
  });
</script>
```

Valid themes are `light`, `dark`, and `system`. Valid positions are `bottom-left` and `bottom-right`.

## Security and deployment

Set `WIDGET_ALLOWED_ORIGINS` to a comma-separated list of exact origins permitted to frame `/widget`, for example:

```dotenv
WIDGET_ALLOWED_ORIGINS=https://www.example.com,https://app.example.com
```

When omitted, the template allows all embedding origins so initial setup cannot silently break. Production deployments should set it.

Sessions use local JSONL storage. Mount `/data/sessions` and run one application container:

```bash
docker build -t orcha-support-widget .
docker run --env-file .env.local -p 3000:3000 \
  -v orcha-support-sessions:/data/sessions orcha-support-widget
```

The rate limiter is intentionally process-local for a single-container starter. Replace it with a shared store before horizontal scaling. Third-party cookie policies vary by browser; the visitor cookie is signed, HttpOnly, Secure in production, and partitioned for embedded use.

## API

- `POST /api/chat` starts or resumes a conversation and streams NDJSON.
- `GET /api/sessions` lists conversations belonging to the signed visitor.
- `GET /api/sessions/:sessionId` loads visitor-owned history.
- `GET /api/config` exposes non-secret branding for the launcher.
- `GET /embed.js` serves the self-hosted loader.

## License

MIT
