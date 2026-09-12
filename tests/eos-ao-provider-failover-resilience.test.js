/**
 * @file eos-ao-provider-failover-resilience.test.js
 * @description SPEC-0046 / Mission AO — Provider Failover & Resilience Router.
 * Hermetic TDD: primary success; primary fail → secondary under ECR PASS;
 * ECR deny on active → failover; all exhausted → DENY + receipt (no unbounded
 * retry); secrets never in receipts (runtime synth); PRODUCTION_READY NO;
 * rg vendor-prefix CLEAN; NON-CLAIM markers; MISSING_DEP.
 * PRODUCTION_READY: NO
 *
 * Law VI / AF11 lesson: never put literal vendor key prefixes as static
 * string literals in source/tests — build synthetic fixtures at runtime.
 *
 * NON-CLAIM: failover ≠ PRODUCTION_READY LLM ops ≠ SLA product ≠ multi-cloud
 * billing; not AP/AQ/AR; Fundacion Δ=0.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AO_PRODUCTION_READY,
  AO_KIND,
  AO_CODES,
  ProviderFailoverResilienceError,
  createProviderFailoverResilienceRouter,
  createMemoryEcrMeter,
  sanitizeAoPayload,
  defaultHash,
  stableStringify,
  AO_PROBE_KIND,
  AO_PROBE_PRODUCTION_READY,
  probeProvider,
  createProviderHealthProbe
} from '../src/core/llm/provider-failover-resilience-router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ROUTER_PATH = path.join(
  ROOT,
  'src/core/llm/provider-failover-resilience-router.js'
);
const PROBE_PATH = path.join(ROOT, 'src/core/llm/provider-health-probe.js');
const TEST_PATH = path.resolve(
  __dirname,
  'eos-ao-provider-failover-resilience.test.js'
);

/**
 * Build a synthetic vendor-style key at runtime (Law VI — no static literals).
 */
function synthVendorKey(suffix = 'abcdefghijklmnopqrstuvwxyz012345') {
  const prefix = String.fromCharCode(115, 107, 45); // s k -
  return prefix + suffix;
}

function synthBearer() {
  return 'Bearer ' + 'Z'.repeat(48);
}

/**
 * @param {object} [opts]
 */
function fakeProvider(opts = {}) {
  const id = opts.id || 'primary';
  let invokeCount = 0;
  return {
    id,
    invokeCount: () => invokeCount,
    async probe() {
      if (opts.probeFail) {
        return { ok: false, reason: opts.probeReason || 'probe-fail' };
      }
      if (typeof opts.probe === 'function') return opts.probe();
      return { ok: true };
    },
    async invoke(request) {
      invokeCount += 1;
      if (opts.invokeThrow) {
        const err = new Error(opts.invokeThrowMessage || 'invoke failed');
        err.code = opts.invokeThrowCode || AO_CODES.DENY;
        throw err;
      }
      if (opts.invokeFail) {
        const err = new Error('provider deny');
        err.code = AO_CODES.DENY;
        throw err;
      }
      return {
        ok: true,
        text: opts.text || `ok-from-${id}`,
        provider: id,
        echo: request && request.prompt
      };
    }
  };
}

function router(opts = {}) {
  return createProviderFailoverResilienceRouter({
    providers: opts.providers,
    ecr: opts.ecr,
    now: opts.now,
    hash: opts.hash,
    receiptSealer: opts.receiptSealer,
    requireProviders: opts.requireProviders,
    requireEcr: opts.requireEcr,
    throwOnDeny: opts.throwOnDeny,
    hitlOnExhaust: opts.hitlOnExhaust,
    rejectSecretsInRequest: opts.rejectSecretsInRequest
  });
}

// ── AO1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AO1: kind eos-provider-failover-resilience-router and PRODUCTION_READY NO', async () => {
  const r = router({
    providers: [fakeProvider({ id: 'p1' })],
    ecr: createMemoryEcrMeter({ ceiling: 50 })
  });
  assert.equal(r.kind, AO_KIND);
  assert.equal(r.kind, 'eos-provider-failover-resilience-router');
  assert.equal(r.PRODUCTION_READY, 'NO');
  assert.equal(AO_PRODUCTION_READY, 'NO');
  const h = r.health();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.kind, AO_KIND);
  assert.equal(h.fundacionDelta, 0);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.usesCloudAgent, false);
  assert.equal(h.nonClaim.failoverNotProductionReadyLlmOps, true);
  assert.equal(h.nonClaim.failoverNotSlaProduct, true);
  assert.equal(h.nonClaim.failoverNotMultiCloudBilling, true);
  assert.equal(h.nonClaim.notApAqAr, true);
  assert.equal(AO_PROBE_KIND, 'eos-provider-health-probe');
  assert.equal(AO_PROBE_PRODUCTION_READY, 'NO');
});

// ── AO2: primary success ────────────────────────────────────────────────────
test('AO2: primary success — route/invoke COMPLETED', async () => {
  const primary = fakeProvider({ id: 'primary' });
  const secondary = fakeProvider({ id: 'secondary' });
  const ecr = createMemoryEcrMeter({ ceiling: 100 });
  const r = router({ providers: [primary, secondary], ecr });

  const out = await r.route({ prompt: 'hello', tokens: 5 });
  assert.equal(out.ok, true);
  assert.equal(out.code, AO_CODES.COMPLETED);
  assert.equal(out.providerId, 'primary');
  assert.equal(out.result.text, 'ok-from-primary');
  assert.equal(r.getActiveProviderId(), 'primary');
  assert.equal(primary.invokeCount(), 1);
  assert.equal(secondary.invokeCount(), 0);
  assert.ok(out.receipt);
  assert.equal(out.receipt.PRODUCTION_READY, 'NO');
  assert.equal(out.PRODUCTION_READY, 'NO');

  const viaInvoke = await r.invoke({ prompt: 'again', tokens: 3 });
  assert.equal(viaInvoke.ok, true);
  assert.equal(viaInvoke.providerId, 'primary');
});

// ── AO3: primary fail → secondary under ECR PASS ────────────────────────────
test('AO3: primary probe fail → secondary under ECR PASS', async () => {
  const primary = fakeProvider({ id: 'primary', probeFail: true });
  const secondary = fakeProvider({ id: 'secondary' });
  const ecr = createMemoryEcrMeter({ ceiling: 100, used: 0 });
  const r = router({ providers: [primary, secondary], ecr });

  const out = await r.route({ prompt: 'failover', tokens: 10 });
  assert.equal(out.ok, true);
  assert.equal(out.code, AO_CODES.COMPLETED);
  assert.equal(out.providerId, 'secondary');
  assert.equal(primary.invokeCount(), 0);
  assert.equal(secondary.invokeCount(), 1);
  assert.ok(out.attempts.some((a) => a.code === AO_CODES.PROVIDER_PROBE_FAIL));
  assert.ok(out.attempts.some((a) => a.code === AO_CODES.COMPLETED));
  assert.ok(r._getFailoverCount() >= 1);
  assert.equal(ecr.remaining(), 90);
});

// ── AO4: primary invoke fail → secondary under ECR PASS ─────────────────────
test('AO4: primary invoke fail → secondary under ECR PASS', async () => {
  const primary = fakeProvider({ id: 'primary', invokeFail: true });
  const secondary = fakeProvider({ id: 'secondary', text: 'rescued' });
  const ecr = createMemoryEcrMeter({ ceiling: 40 });
  const r = router({ providers: [primary, secondary], ecr });

  const out = await r.invoke({ prompt: 'retry', tokens: 4 });
  assert.equal(out.ok, true);
  assert.equal(out.providerId, 'secondary');
  assert.equal(out.result.text, 'rescued');
  assert.equal(primary.invokeCount(), 1);
  assert.equal(secondary.invokeCount(), 1);
});

// ── AO5: ECR deny on active → failover to next under remaining budget ───────
test('AO5: ECR deny on active provider → failover under remaining budget', async () => {
  let primaryCalls = 0;
  const primary = {
    id: 'primary',
    async probe() {
      return { ok: true };
    },
    async invoke() {
      primaryCalls += 1;
      // Simulate provider-local ECR deny (e.g. per-provider trip)
      const err = new Error('active provider ECR deny');
      err.code = AO_CODES.ECR_DENY;
      throw err;
    }
  };
  const secondary = fakeProvider({ id: 'secondary' });
  // Enough budget for secondary attempt
  const ecr = createMemoryEcrMeter({ ceiling: 20, used: 0 });
  const r = router({ providers: [primary, secondary], ecr });

  const out = await r.route({ prompt: 'ecr-failover', tokens: 5 });
  assert.equal(out.ok, true);
  assert.equal(out.providerId, 'secondary');
  assert.equal(primaryCalls, 1);
  assert.ok(out.attempts.some((a) => a.code === AO_CODES.ECR_DENY));
  assert.ok(out.attempts.some((a) => a.code === AO_CODES.COMPLETED));
});

// ── AO6: all exhausted → DENY + receipt, no unbounded retry ─────────────────
test('AO6: all providers exhausted → FAILOVER_EXHAUSTED DENY + receipt; no unbounded retry', async () => {
  const p1 = fakeProvider({ id: 'a', probeFail: true });
  const p2 = fakeProvider({ id: 'b', invokeFail: true });
  const p3 = fakeProvider({ id: 'c', probeFail: true });
  const ecr = createMemoryEcrMeter({ ceiling: 100 });
  const r = router({ providers: [p1, p2, p3], ecr });

  const out = await r.route({ prompt: 'exhaust', tokens: 1 });
  assert.equal(out.ok, false);
  assert.equal(out.allow, false);
  assert.equal(out.code, AO_CODES.FAILOVER_EXHAUSTED);
  assert.equal(out.hitlRequired, true);
  assert.equal(out.unboundedRetry, false);
  assert.ok(out.receipt);
  assert.equal(out.receipt.code, AO_CODES.FAILOVER_EXHAUSTED);
  assert.equal(out.receipt.PRODUCTION_READY, 'NO');
  assert.ok(out.receipt.sealed);
  assert.ok(Array.isArray(out.attempts));
  assert.ok(out.attempts.length >= 2);

  // Second call must NOT silently unbounded-retry — still DENY
  const again = await r.route({ prompt: 'again', tokens: 1 });
  assert.equal(again.ok, false);
  assert.equal(again.code, AO_CODES.FAILOVER_EXHAUSTED);
  // providers should not be re-invoked unboundedly after exhaust latch
  assert.equal(p2.invokeCount(), 1);
});

// ── AO7: ECR ceiling hit → ECR_DENY + receipt ───────────────────────────────
test('AO7: ECR ceiling hit → ECR_DENY + sealed receipt; HITL', async () => {
  const primary = fakeProvider({ id: 'primary' });
  const ecr = createMemoryEcrMeter({ ceiling: 5, used: 5 });
  const r = router({ providers: [primary], ecr });

  const out = await r.route({ prompt: 'over', tokens: 1 });
  assert.equal(out.ok, false);
  assert.equal(out.code, AO_CODES.ECR_DENY);
  assert.equal(out.hitlRequired, true);
  assert.ok(out.receipt);
  assert.equal(out.receipt.code, AO_CODES.ECR_DENY);
  assert.equal(primary.invokeCount(), 0);
});

// ── AO8: secrets never in receipts (runtime synth) ──────────────────────────
test('AO8: Law VI — secrets never in receipts (runtime synth)', async () => {
  const dirtyKey = synthVendorKey();
  const dirtyBearer = synthBearer();
  const primary = fakeProvider({ id: 'primary' });
  const ecr = createMemoryEcrMeter({ ceiling: 50 });
  const r = router({ providers: [primary], ecr });

  const out = await r.route({
    prompt: 'safe',
    tokens: 2,
    meta: { note: 'ok' },
    // Attempt to smuggle — must not land in receipt
    apiKey: dirtyKey,
    authorization: dirtyBearer,
    token: dirtyKey
  });
  assert.equal(out.ok, true);
  const dumped = JSON.stringify(out.receipt);
  assert.equal(dumped.includes(dirtyKey), false);
  assert.equal(dumped.includes(dirtyBearer), false);

  // Explicit persistSecrets → SECRET_LEAK_FORBIDDEN
  const leak = await r.route({
    prompt: 'leak',
    tokens: 1,
    apiKey: dirtyKey,
    persistSecrets: true
  });
  assert.equal(leak.ok, false);
  assert.equal(leak.code, AO_CODES.SECRET_LEAK_FORBIDDEN);
  const leakDump = JSON.stringify(leak);
  assert.equal(leakDump.includes(dirtyKey), false);

  const clean = sanitizeAoPayload({
    apiKey: dirtyKey,
    authorization: dirtyBearer,
    nested: { token: dirtyKey, password: 'x', safe: 'ok' },
    providerId: 'primary'
  });
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.authorization, '[REDACTED]');
  assert.equal(clean.nested.token, '[REDACTED]');
  assert.equal(clean.nested.password, '[REDACTED]');
  assert.equal(clean.nested.safe, 'ok');
  assert.equal(clean.providerId, 'primary');

  const err = new ProviderFailoverResilienceError(
    `leak ${dirtyKey}`,
    AO_CODES.DENY
  );
  assert.ok(
    err.message.includes('[REDACTED]') || !err.message.includes(dirtyKey)
  );
});

// ── AO9: PRODUCTION_READY === 'NO' pinned everywhere ────────────────────────
test('AO9: PRODUCTION_READY === NO on router, receipts, health, state', async () => {
  const primary = fakeProvider({ id: 'p' });
  const r = router({
    providers: [primary],
    ecr: createMemoryEcrMeter({ ceiling: 10 })
  });
  const out = await r.route({ prompt: 'pr', tokens: 1 });
  assert.equal(out.PRODUCTION_READY, 'NO');
  assert.equal(out.receipt.PRODUCTION_READY, 'NO');
  assert.equal(r.health().PRODUCTION_READY, 'NO');
  assert.equal(r.getState().PRODUCTION_READY, 'NO');
  assert.equal(AO_PRODUCTION_READY, 'NO');
  const src = fs.readFileSync(ROUTER_PATH, 'utf8');
  assert.match(src, /AO_PRODUCTION_READY\s*=\s*'NO'/);
  assert.match(src, /PRODUCTION_READY:\s*NO/);
});

// ── AO10: Law VI — no static vendor-key literals (rg CLEAN) ──────────────────
test('AO10: Law VI — no static vendor-key literals in payload sources (rg vendor-prefix CLEAN)', () => {
  const files = [ROUTER_PATH, PROBE_PATH, TEST_PATH];
  const vendorLiteralRe = new RegExp(
    `['"]${String.fromCharCode(115, 107, 45)}[A-Za-z0-9]{8,}['"]`
  );
  // Also forbid bare vendor-prefix as a contiguous static literal in source
  const barePrefix = String.fromCharCode(115, 107, 45);
  for (const f of files) {
    const body = fs.readFileSync(f, 'utf8');
    assert.equal(
      vendorLiteralRe.test(body),
      false,
      `static vendor-key literal found in ${path.basename(f)}`
    );
    // Ensure we did not write the three chars s,k,- as a contiguous static
    // string literal (charCode / join patterns are OK)
    const staticSk = new RegExp(
      `['"\`][^'"\`]*${barePrefix.replace('-', '\\-')}[^'"\`]*['"\`]`
    );
    // Allow only if built via join/fromCharCode — reject contiguous in quotes
    const contiguousInQuotes = new RegExp(
      `['"\`]${barePrefix.replace('-', '\\-')}`
    );
    assert.equal(
      contiguousInQuotes.test(body),
      false,
      `contiguous vendor-prefix literal in quotes in ${path.basename(f)}`
    );
    void staticSk;
  }
  assert.ok(synthVendorKey().startsWith(barePrefix));
});

// ── AO11: NON-CLAIM markers present in source + health ──────────────────────
test('AO11: NON-CLAIM markers — not PRODUCTION_READY LLM ops / SLA / billing / AP–AR', () => {
  const src = fs.readFileSync(ROUTER_PATH, 'utf8');
  assert.ok(
    /PRODUCTION_READY LLM ops/i.test(src) ||
      /failoverNotProductionReadyLlmOps/.test(src)
  );
  assert.ok(/SLA product/i.test(src) || /failoverNotSlaProduct/.test(src));
  assert.ok(
    /multi-cloud billing/i.test(src) || /failoverNotMultiCloudBilling/.test(src)
  );
  assert.ok(/not AP\/AQ\/AR/i.test(src) || /notApAqAr/.test(src));
  assert.ok(/Antigravity-first/i.test(src));
  assert.ok(/Law VI/i.test(src));
  assert.ok(/CloudAgent/.test(src));

  const h = router({
    providers: [fakeProvider({ id: 'x' })],
    ecr: createMemoryEcrMeter()
  }).health();
  assert.equal(h.nonClaim.failoverNotProductionReadyLlmOps, true);
  assert.equal(h.nonClaim.failoverNotSlaProduct, true);
  assert.equal(h.nonClaim.failoverNotMultiCloudBilling, true);
  assert.equal(h.nonClaim.notApAqAr, true);
  assert.equal(h.cloudAgent, false);
});

// ── AO12: MISSING_DEP when injectors absent ──────────────────────────────────
test('AO12: MISSING_DEP when providers/ecr injectors absent', async () => {
  const r1 = router({ requireProviders: true, providers: [] });
  const out1 = await r1.route({ prompt: 'x', tokens: 1 });
  assert.equal(out1.ok, false);
  assert.equal(out1.code, AO_CODES.MISSING_DEP);
  assert.equal(out1.dep, 'providers');

  const r2 = router({
    requireEcr: true,
    providers: [fakeProvider({ id: 'p' })],
    ecr: null
  });
  const out2 = await r2.route({ prompt: 'x', tokens: 1 });
  assert.equal(out2.ok, false);
  assert.equal(out2.code, AO_CODES.MISSING_DEP);
  assert.equal(out2.dep, 'ecr');
});

// ── AO13: setOrder / listProviders / getActiveProviderId / probeActive ──────
test('AO13: setOrder, listProviders, getActiveProviderId, probeActive', async () => {
  const a = fakeProvider({ id: 'a' });
  const b = fakeProvider({ id: 'b' });
  const c = fakeProvider({ id: 'c', probeFail: true });
  const r = router({
    providers: [a, b, c],
    ecr: createMemoryEcrMeter({ ceiling: 30 })
  });

  assert.deepEqual(
    r.listProviders().map((p) => p.id),
    ['a', 'b', 'c']
  );
  assert.equal(r.getActiveProviderId(), 'a');

  const ordered = r.setOrder(['c', 'a', 'b']);
  assert.equal(ordered.ok, true);
  assert.deepEqual(ordered.order, ['c', 'a', 'b']);
  assert.equal(r.getActiveProviderId(), 'c');

  const probe = await r.probeActive();
  assert.equal(probe.ok, false);
  assert.equal(probe.code, AO_CODES.PROVIDER_PROBE_FAIL);
  assert.equal(probe.providerId, 'c');

  // After setOrder to healthy first
  r.setOrder(['b', 'a']);
  const probeOk = await r.probeActive();
  assert.equal(probeOk.ok, true);
  assert.equal(probeOk.providerId, 'b');

  const bad = r.setOrder([]);
  assert.equal(bad.ok, false);
  assert.equal(bad.code, AO_CODES.INVALID_REQUEST);
});

// ── AO14: hermetic — no fetch/http / no CloudAgent; fail-closed codes ───────
test('AO14: hermetic — no fetch/http; no CloudAgent; fail-closed codes present', () => {
  const src = fs.readFileSync(ROUTER_PATH, 'utf8');
  assert.equal(/\bfetch\s*\(/.test(src), false);
  assert.equal(/\bhttp\.request\b/.test(src), false);
  assert.equal(/from ['"]cloudagent/i.test(src), false);
  assert.equal(/require\(['"]cloudagent/i.test(src), false);
  for (const code of [
    'PROVIDER_PROBE_FAIL',
    'ECR_DENY',
    'FAILOVER_EXHAUSTED',
    'MISSING_DEP',
    'INVALID_REQUEST',
    'SECRET_LEAK_FORBIDDEN',
    'HITL_REQUIRED'
  ]) {
    assert.ok(src.includes(code), `missing code ${code}`);
    assert.equal(AO_CODES[code], code);
  }
});

// ── AO15: INVALID_REQUEST + probe helper + sealReceipt + hash helpers ───────
test('AO15: INVALID_REQUEST; probe helper; sealReceipt; stableStringify/hash', async () => {
  const r = router({
    providers: [fakeProvider({ id: 'p' })],
    ecr: createMemoryEcrMeter({ ceiling: 10 })
  });
  const bad = await r.route(null);
  assert.equal(bad.code, AO_CODES.INVALID_REQUEST);

  const probeHelper = createProviderHealthProbe();
  assert.equal(probeHelper.kind, AO_PROBE_KIND);
  const okProbe = await probeHelper.probe(fakeProvider({ id: 'z' }));
  assert.equal(okProbe.ok, true);
  const miss = await probeProvider(null);
  assert.equal(miss.code, 'MISSING_DEP');

  assert.equal(
    stableStringify({ b: 1, a: 2 }),
    stableStringify({ a: 2, b: 1 })
  );
  const dig = defaultHash({ x: 1 });
  assert.equal(dig.length, 64);

  const rcpt = r.sealReceipt({
    ok: true,
    code: AO_CODES.OK,
    phase: 'MANUAL'
  });
  assert.equal(rcpt.sealed, true);
  assert.equal(rcpt.PRODUCTION_READY, 'NO');
  assert.ok(rcpt.receiptDigest);
  assert.ok(r.getReceipts().length >= 1);
});

// ── AO16: HITL_REQUIRED on exhaust + getState NON-CLAIM ─────────────────────
test('AO16: HITL on exhaust; getState NON-CLAIM; Fundacion ALWAYS_DENY', async () => {
  const r = router({
    providers: [
      fakeProvider({ id: 'x', probeFail: true }),
      fakeProvider({ id: 'y', probeFail: true })
    ],
    ecr: createMemoryEcrMeter({ ceiling: 10 }),
    hitlOnExhaust: true
  });
  const out = await r.route({ prompt: 'hitl', tokens: 1 });
  assert.equal(out.code, AO_CODES.FAILOVER_EXHAUSTED);
  assert.equal(out.hitlRequired, true);
  assert.equal(out.receipt.hitlRequired, true);

  const st = r.getState();
  assert.equal(st.fundacion, 'ALWAYS_DENY');
  assert.equal(st.fundacionDelta, 0);
  assert.equal(st.nonClaim.fundacionDelta0, true);
  assert.equal(st.nonClaim.antigravityFirst, true);
  assert.equal(st.nonClaim.lawViEnvOnly, true);
  assert.equal(st.exhausted, true);
  assert.equal(AO_CODES.HITL_REQUIRED, 'HITL_REQUIRED');
});
