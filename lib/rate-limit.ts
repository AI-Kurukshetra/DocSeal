/**
 * Lightweight in-process rate limiter.
 *
 * Uses a Map keyed by an arbitrary string (e.g. ip:token).
 * Automatically sweeps expired entries so memory stays bounded.
 *
 * NOTE: This is per-process and resets on every cold start.
 * For multi-instance deployments replace with Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // unix ms
}

const store = new Map<string, RateLimitEntry>();

// Sweep entries older than 10 minutes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * @param key      Unique string to rate-limit on (e.g. "ip:token")
 * @param limit    Max requests allowed per window
 * @param windowMs Window size in milliseconds
 * @returns        { allowed: boolean; remaining: number }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}
