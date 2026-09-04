export interface RateLimitOptions {
  capacity?: number;
  refillRate?: number; // tokens per second
  windowMs?: number;
  keyGenerator?: (reqOrContext: any) => string;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class TokenBucketRateLimiter {
  private buckets = new Map<string, Bucket>();
  private capacity: number;
  private refillRate: number; // tokens per ms

  constructor(options: RateLimitOptions = {}) {
    this.capacity = options.capacity ?? 10;
    // Default: 2 tokens refill per second (0.002 token / ms)
    const refillTokensPerSec = options.refillRate ?? 2;
    this.refillRate = refillTokensPerSec / 1000;
  }

  public consume(key: string, cost = 1): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    } else {
      const elapsed = now - bucket.lastRefill;
      const tokensToAdd = elapsed * this.refillRate;
      bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      const missingTokens = this.capacity - bucket.tokens;
      const resetMs = Math.ceil(missingTokens / this.refillRate);
      return { allowed: true, remaining: Math.floor(bucket.tokens), resetMs };
    }

    const deficit = cost - bucket.tokens;
    const retryAfterMs = Math.ceil(deficit / this.refillRate);
    return { allowed: false, remaining: 0, resetMs: retryAfterMs };
  }

  public reset(key?: string): void {
    if (key) {
      this.buckets.delete(key);
    } else {
      this.buckets.clear();
    }
  }
}

export function createRateLimitMiddleware(options: RateLimitOptions = {}) {
  const limiter = new TokenBucketRateLimiter(options);
  const keyGen = options.keyGenerator || ((c: any) => {
    const headerFn = c.req?.header ? c.req.header.bind(c.req) : (k: string) => c.headers?.[k] || null;
    const forwarded = headerFn('x-forwarded-for');
    const ip = forwarded ? String(forwarded).split(',')[0].trim() : '127.0.0.1';
    const path = c.req?.path || c.url || '/';
    return `${ip}:${path}`;
  });

  return async function rateLimitMiddleware(c: any, next: () => Promise<void> | void) {
    const key = keyGen(c);
    const result = limiter.consume(key);

    const setHeader = (k: string, v: string) => {
      if (typeof c.header === 'function') c.header(k, v);
      else if (c.res?.setHeader) c.res.setHeader(k, v);
    };

    setHeader('X-RateLimit-Limit', String(options.capacity ?? 10));
    setHeader('X-RateLimit-Remaining', String(result.remaining));
    setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetMs / 1000)));

    if (!result.allowed) {
      setHeader('Retry-After', String(Math.ceil(result.resetMs / 1000)));
      if (typeof c.json === 'function') {
        return c.json(
          {
            error: 'TOO_MANY_REQUESTS',
            message: 'Rate limit exceeded. Please retry after the cooldown period.',
            retry_after_seconds: Math.ceil(result.resetMs / 1000),
          },
          429
        );
      }
      return {
        status: 429,
        body: { error: 'TOO_MANY_REQUESTS', retry_after_seconds: Math.ceil(result.resetMs / 1000) }
      };
    }

    return await next();
  };
}
