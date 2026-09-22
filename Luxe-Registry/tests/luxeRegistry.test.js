import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { LuxeRegistryDomainEngine, TenantIsolationViolation, DoubleBookingException, SecurityValidationException } from '../src/domain/registryEngine.js';
import { createLuxeServer } from '../src/server.js';

test('LuxeRegistry: Tenant Registration & Scoped Item Listing', () => {
  const engine = new LuxeRegistryDomainEngine();
  engine.registerTenant('TENANT-WEDDING-01', 'Smith & Jones Wedding', 'smith@example.com');

  const item1 = engine.addGiftItem('TENANT-WEDDING-01', 'ITEM-01', 'Espresso Machine', 350.00);
  assert.equal(item1.status, 'AVAILABLE');

  const items = engine.getItemsByTenant('TENANT-WEDDING-01', 'TENANT-WEDDING-01');
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Espresso Machine');
});

test('LuxeRegistry: Tenant Isolation Guard Rejects Cross-Tenant Access', () => {
  const engine = new LuxeRegistryDomainEngine();
  engine.registerTenant('TENANT-A', 'Tenant A Registry', 'a@example.com');
  engine.registerTenant('TENANT-B', 'Tenant B Registry', 'b@example.com');

  engine.addGiftItem('TENANT-A', 'ITEM-A1', 'Luxury Towel Set', 120.00);

  // Attempting to query TENANT-A items with TENANT-B credentials MUST throw TenantIsolationViolation!
  assert.throws(
    () => engine.getItemsByTenant('TENANT-A', 'TENANT-B'),
    (err) => err instanceof TenantIsolationViolation && err.statusCode === 403
  );

  assert.equal(engine.auditLogs.length, 3);
  assert.equal(engine.auditLogs[2].event_type, 'CROSS_TENANT_READ_BLOCKED');
});

test('LuxeRegistry: Security Input Sanitization Rejects Malicious XSS Payload', () => {
  const engine = new LuxeRegistryDomainEngine();
  engine.registerTenant('TENANT-SEC-01', 'Secure Event', 'sec@example.com');

  assert.throws(
    () => engine.addGiftItem('TENANT-SEC-01', 'ITEM-XSS', '<script>alert("xss")</script>', 100.00),
    (err) => err instanceof SecurityValidationException && err.statusCode === 400
  );
});

test('LuxeRegistry: Atomic Reservation Prevents Double Booking Under Concurrency', async () => {
  const engine = new LuxeRegistryDomainEngine();
  engine.registerTenant('TENANT-GALA-01', 'Annual Gala', 'gala@example.com');
  engine.addGiftItem('TENANT-GALA-01', 'ITEM-GIFT-99', 'Crystal Vase', 500.00);

  // Simulate 5 simultaneous guest reservation attempts
  const attempts = Array.from({ length: 5 }, (_, i) => 
    engine.reserveItem('TENANT-GALA-01', 'ITEM-GIFT-99', `GUEST-0${i+1}`, 'TENANT-GALA-01')
      .then(res => ({ success: true, res }))
      .catch(err => ({ success: false, err }))
  );

  const results = await Promise.all(attempts);

  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);

  assert.equal(successes.length, 1, 'EXACTLY ONE reservation MUST succeed');
  assert.equal(failures.length, 4, 'ALL OTHER 4 concurrent attempts MUST fail with double booking conflict');
  assert.ok(failures[0].err instanceof DoubleBookingException);
});

test('LuxeRegistry: Contribution Ledger Records Certified Transactions & Fulfills Goal', () => {
  const engine = new LuxeRegistryDomainEngine();
  engine.registerTenant('TENANT-BABY-01', 'Baby Shower Registry', 'baby@example.com');
  engine.addGiftItem('TENANT-BABY-01', 'ITEM-STROLLER', 'Premium Stroller', 800.00, true);

  const c1 = engine.recordContribution('TENANT-BABY-01', 'ITEM-STROLLER', 'GUEST-UNCLE', 400.00, 'TX-PAY-001', 'TENANT-BABY-01');
  assert.equal(c1.certified_status, 'CERTIFIED');

  const itemsBefore = engine.getItemsByTenant('TENANT-BABY-01', 'TENANT-BABY-01');
  assert.equal(itemsBefore[0].status, 'AVAILABLE');

  engine.recordContribution('TENANT-BABY-01', 'ITEM-STROLLER', 'GUEST-AUNT', 400.00, 'TX-PAY-002', 'TENANT-BABY-01');
  const itemsAfter = engine.getItemsByTenant('TENANT-BABY-01', 'TENANT-BABY-01');
  assert.equal(itemsAfter[0].status, 'FULFILLED', 'Item status MUST transition to FULFILLED once goal is reached');
});

test('LuxeRegistry: Performance Telemetry Interceptor & Distribution Sampling', () => {
  const engine = new LuxeRegistryDomainEngine();
  engine.registerTenant('TENANT-PERF-01', 'Perf Event', 'perf@example.com');

  for (let i = 0; i < 10; i++) {
    engine.addGiftItem('TENANT-PERF-01', `ITEM-${i}`, `Gift Item ${i}`, 50 + i);
  }

  const dist = engine.getPerformanceDistribution();
  assert.equal(dist.sample_size, 10);
  assert.ok(dist.mean_ms >= 0);
  assert.ok(dist.p95_ms >= 0);
});

test('LuxeRegistry: REST API Server Integration & HTTP Isolation Intercept', async () => {
  const server = createLuxeServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  const get = (urlPath, headers = {}) => new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:${port}${urlPath}`, { headers }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.end();
  });

  const health = await get('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.status, 'UP');

  const telemetry = await get('/api/telemetry');
  assert.equal(telemetry.status, 200);

  server.close();
});

test('LuxeRegistry: CORS Security Headers Validated via ALLOWED_ORIGINS', async () => {
  process.env.ALLOWED_ORIGINS = 'https://trusted.luxe-registry.com, http://localhost:3000';

  const server = createLuxeServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  const get = (urlPath, headers = {}) => new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:${port}${urlPath}`, { headers }, res => {
      resolve({ status: res.statusCode, headers: res.headers });
    });
    req.on('error', reject);
    req.end();
  });

  // Test valid origin
  const validResp = await get('/api/health', { origin: 'https://trusted.luxe-registry.com' });
  assert.equal(validResp.headers['access-control-allow-origin'], 'https://trusted.luxe-registry.com');
  assert.equal(validResp.headers['vary'], 'Origin');

  // Test invalid origin
  const invalidResp = await get('/api/health', { origin: 'https://malicious-hacker.com' });
  assert.equal(invalidResp.headers['access-control-allow-origin'], undefined);

  server.close();
});
