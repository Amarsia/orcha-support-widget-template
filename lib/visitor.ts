import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "orcha_support_visitor";
const MAX_AGE = 60 * 60 * 24 * 365;

function secret(): string {
  const value = process.env.VISITOR_COOKIE_SECRET;
  if (process.env.NODE_ENV === "production" && (!value || value.length < 32)) {
    throw new Error("VISITOR_COOKIE_SECRET must be at least 32 characters in production.");
  }
  return value || "development-only-secret-change-before-production";
}

function sign(id: string): string {
  return createHmac("sha256", secret()).update(id).digest("base64url");
}

function readCookie(header: string | null): string | undefined {
  return header?.split(";").map((part) => part.trim()).find((part) =>
    part.startsWith(`${COOKIE_NAME}=`),
  )?.slice(COOKIE_NAME.length + 1);
}

function valid(value: string): string | undefined {
  const [id, signature] = decodeURIComponent(value).split(".");
  if (!id || !signature || !/^[0-9a-f-]{36}$/i.test(id)) return;
  const expected = Buffer.from(sign(id));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received) ? id : undefined;
}

export function resolveVisitor(request: Request): { id: string; setCookie?: string } {
  const current = readCookie(request.headers.get("cookie"));
  const id = current ? valid(current) : undefined;
  if (id) return { id };

  const nextId = randomUUID();
  const embedded = process.env.NODE_ENV === "production"
    ? "; SameSite=None; Secure; Partitioned"
    : "; SameSite=Lax";
  return {
    id: nextId,
    setCookie: `${COOKIE_NAME}=${encodeURIComponent(`${nextId}.${sign(nextId)}`)}; Path=/; HttpOnly; Max-Age=${MAX_AGE}${embedded}`,
  };
}

export function responseHeaders(setCookie?: string, contentType?: string): Headers {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (contentType) headers.set("Content-Type", contentType);
  if (setCookie) headers.set("Set-Cookie", setCookie);
  return headers;
}
