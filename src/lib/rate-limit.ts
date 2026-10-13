/**
 * Простой in-memory лимитер запросов.
 * Живёт в рамках одного инстанса функции (на Vercel их несколько),
 * поэтому это «демпфер», а не строгий распределённый лимит.
 * Для жёстких порогов используем дополнительно Vercel WAF (см. README).
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size > MAX_KEYS) {
    const excess = buckets.size - Math.floor(MAX_KEYS / 2);
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++removed >= excess) break;
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > MAX_KEYS) sweep(now);
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function clientIp(request: Request): string {
  // Vercel перезаписывает x-forwarded-for и отбрасывает внешние значения.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitByIp(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  return rateLimit(`${scope}:ip:${clientIp(request)}`, limit, windowMs);
}

export function rateLimitByUser(
  scope: string,
  userId: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  return rateLimit(`${scope}:user:${userId}`, limit, windowMs);
}
