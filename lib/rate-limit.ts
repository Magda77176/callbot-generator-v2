import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash ? Redis.fromEnv() : null;

function makeLimiter(prefix: string, limit: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
    prefix,
  });
}

// Enrichment is expensive (DataForSEO + scrape + Claude). Cap tight per IP.
export const enrichLimiter = makeLimiter('rl:enrich', 10, '1 h');

// Deploy creates a paid Vapi assistant. Cap even tighter.
export const deployLimiter = makeLimiter('rl:deploy', 5, '1 h');

export function clientIp(req: NextRequest | Request): string {
  const headers = req.headers;
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  const real = headers.get('x-real-ip');
  if (real) return real.trim();
  return 'anonymous';
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

export async function checkLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<RateLimitDecision> {
  if (!limiter) {
    // Upstash not configured — fail open with a warning. Production should set the env vars.
    if (!process.env.RATE_LIMIT_SILENT) {
      console.warn(
        '[rate-limit] Upstash not configured (UPSTASH_REDIS_REST_URL/TOKEN missing). Allowing request.',
      );
    }
    return { allowed: true, remaining: Infinity, reset: 0, limit: Infinity };
  }
  const r = await limiter.limit(identifier);
  return { allowed: r.success, remaining: r.remaining, reset: r.reset, limit: r.limit };
}

export function rateLimitHeaders(d: RateLimitDecision): Record<string, string> {
  if (d.limit === Infinity) return {};
  return {
    'X-RateLimit-Limit': String(d.limit),
    'X-RateLimit-Remaining': String(d.remaining),
    'X-RateLimit-Reset': String(d.reset),
  };
}
