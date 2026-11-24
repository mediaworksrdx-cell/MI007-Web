import { NextRequest } from 'next/server';

interface RateBucket {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateBucket>>();

/**
 * Extracts best-effort client IP for rate limiting behind Nginx on GCP.
 * Strictly trusts Nginx-injected `x-real-ip` first and never trusts client-spoofable
 * `x-vercel-forwarded-for` or `cf-connecting-ip` headers off those platforms.
 */
export function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    // Use rightmost entry (set by trusted reverse proxy, not client-prepended spoofed IPs)
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Sliding/fixed-window in-memory rate limiter with periodic pruning.
 * Note: For multi-instance / serverless production, back with Redis / Upstash.
 */
export function checkRateLimit(
  namespace: string,
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  let store = stores.get(namespace);
  if (!store) {
    store = new Map<string, RateBucket>();
    stores.set(namespace, store);
  }

  const now = Date.now();

  // Prune expired buckets occasionally to bound memory
  if (store.size > 5000) {
    for (const [k, v] of store.entries()) {
      if (now > v.resetAt) store.delete(k);
    }
  }

  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - entry.count),
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}
