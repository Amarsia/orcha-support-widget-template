import "server-only";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const LIMIT = 20;

export function consumeRateLimit(visitorId: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const current = buckets.get(visitorId);
  if (!current || current.resetAt <= now) {
    buckets.set(visitorId, { count: 1, resetAt: now + WINDOW_MS });
    if (buckets.size > 10_000) {
      for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
    }
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}
