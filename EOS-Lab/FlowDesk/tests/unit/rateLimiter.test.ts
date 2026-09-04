import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TokenBucketRateLimiter, createRateLimitMiddleware } from '../../src/middleware/rateLimiter.js';

describe('TokenBucketRateLimiter — Unit Tests', () => {
  test('should allow consumption within capacity and track remaining tokens', () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 5, refillRate: 1 });

    const first = limiter.consume('test-client');
    assert.equal(first.allowed, true);
    assert.equal(first.remaining, 4);

    const second = limiter.consume('test-client');
    assert.equal(second.allowed, true);
    assert.equal(second.remaining, 3);
  });

  test('should reject request when tokens are exhausted (burst capacity reached)', () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 2, refillRate: 0.1 });

    assert.equal(limiter.consume('burst-client').allowed, true);
    assert.equal(limiter.consume('burst-client').allowed, true);

    // 3rd attempt must be blocked
    const blocked = limiter.consume('burst-client');
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.ok(blocked.resetMs > 0);
  });

  test('should isolate rate limits across different keys', () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 1, refillRate: 0.1 });

    assert.equal(limiter.consume('client-A').allowed, true);
    assert.equal(limiter.consume('client-A').allowed, false);

    // Client B must still have its full quota
    assert.equal(limiter.consume('client-B').allowed, true);
    assert.equal(limiter.consume('client-B').allowed, false);
  });
});

describe('Rate Limit Middleware — Pipeline Integration Tests', () => {
  test('should set X-RateLimit headers and block when quota exceeded', async () => {
    const middleware = createRateLimitMiddleware({ capacity: 2, refillRate: 1 });
    const headers: Record<string, string> = {};

    const mockContext = {
      req: {
        path: '/api/v1/leads',
        header: (name: string) => (name === 'x-forwarded-for' ? '192.168.1.100' : null)
      },
      header: (k: string, v: string) => {
        headers[k] = v;
      },
      json: (body: any, status: number) => ({ status, body })
    };

    let nextCalled = 0;
    const next = async () => {
      nextCalled++;
    };

    // Request 1: Passed
    await middleware(mockContext, next);
    assert.equal(nextCalled, 1);
    assert.equal(headers['X-RateLimit-Limit'], '2');
    assert.equal(headers['X-RateLimit-Remaining'], '1');

    // Request 2: Passed
    await middleware(mockContext, next);
    assert.equal(nextCalled, 2);
    assert.equal(headers['X-RateLimit-Remaining'], '0');

    // Request 3: Blocked (429)
    const res = await middleware(mockContext, next);
    assert.equal(nextCalled, 2); // next NOT called
    assert.equal(res?.status, 429);
    assert.equal(res?.body?.error, 'TOO_MANY_REQUESTS');
    assert.ok(headers['Retry-After']);
  });
});
