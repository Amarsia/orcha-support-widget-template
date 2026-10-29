import { NextRequest, NextResponse } from "next/server";

import { resolveVisitor } from "@/lib/visitor";

function allowedFrameAncestors(): string {
  const configured = process.env.WIDGET_ALLOWED_ORIGINS?.trim();
  if (!configured) return "*";
  const origins = configured.split(",").flatMap((value) => {
    try {
      const url = new URL(value.trim());
      return url.protocol === "https:" || (url.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(url.hostname))
        ? [url.origin]
        : [];
    } catch {
      return [];
    }
  });
  return origins.length ? origins.join(" ") : "'none'";
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const visitor = resolveVisitor(request);
  if (visitor.setCookie) {
    response.headers.set("Set-Cookie", visitor.setCookie);
  }
  if (request.nextUrl.pathname === "/widget") {
    response.headers.set(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; frame-ancestors ${allowedFrameAncestors()}; base-uri 'none'; form-action 'self'`,
    );
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-Content-Type-Options", "nosniff");
  }
  return response;
}

export const config = { matcher: ["/widget"] };
