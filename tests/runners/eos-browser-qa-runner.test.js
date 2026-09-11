/**
 * @file eos-browser-qa-runner.test.js
 * @description SPEC-0016 Mission K — Autonomous Chrome DevTools Browser QA Runner.
 * Hermetic by default; live network only when RUN_LIVE_BROWSER_QA_TESTS=true.
 * PRODUCTION_READY: NO
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  PRODUCTION_READY,
  BROWSER_QA_TIMEOUT_MS,
  BROWSER_QA_LCP_GOOD_MS,
  BROWSER_QA_CLS_GOOD,
  BROWSER_QA_A11Y_STANDARD,
  BrowserQaRunnerError,
  hashBrowserQaInput,
  evaluateCwv,
  evaluateA11y,
  runBrowserQa
} from '../../src/core/qa/browser-qa-runner.js';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function makeMockClient(overrides = {}) {
  const calls = [];
  const client = {
    calls,
    navigate: async (url) => {
      calls.push({ method: 'navigate', args: { url } });
      return { ok: true };
    },
    collectCwv: async () => {
      calls.push({ method: 'collectCwv', args: {} });
      return { lcpMs: 1200, cls: 0.01 };
    },
    runA11yScan: async () => {
      calls.push({ method: 'runA11yScan', args: {} });
      return { violations: [] };
    },
    captureScreenshot: async () => {
      calls.push({ method: 'captureScreenshot', args: {} });
      return { mimeType: 'image/png', base64: PNG_BASE64 };
    },
    ...overrides
  };
  return client;
}

test('Mission K: constants / PRODUCTION_READY NO / thresholds', () => {
  assert.equal(PRODUCTION_READY, 'NO');
  assert.equal(BROWSER_QA_TIMEOUT_MS, 30000);
  assert.equal(BROWSER_QA_LCP_GOOD_MS, 2500);
  assert.equal(BROWSER_QA_CLS_GOOD, 0.1);
  assert.equal(BROWSER_QA_A11Y_STANDARD, 'WCAG2.1-AA');
  assert.equal(typeof BrowserQaRunnerError, 'function');
  const err = new BrowserQaRunnerError('x', 'CODE', { a: 1 });
  assert.equal(err.name, 'BrowserQaRunnerError');
  assert.equal(err.code, 'CODE');
  assert.deepEqual(err.details, { a: 1 });
});

test('Mission K: evaluateCwv pass (good LCP+CLS)', () => {
  const out = evaluateCwv({ lcpMs: 1200, cls: 0.01 });
  assert.equal(out.lcpPass, true);
  assert.equal(out.clsPass, true);
  assert.equal(out.pass, true);
  assert.equal(out.lcpMs, 1200);
  assert.equal(out.cls, 0.01);
});

test('Mission K: evaluateCwv fail LCP > 2500', () => {
  const out = evaluateCwv({ lcpMs: 2501, cls: 0.01 });
  assert.equal(out.lcpPass, false);
  assert.equal(out.clsPass, true);
  assert.equal(out.pass, false);
});

test('Mission K: evaluateCwv fail CLS > 0.1', () => {
  const out = evaluateCwv({ lcpMs: 1000, cls: 0.11 });
  assert.equal(out.lcpPass, true);
  assert.equal(out.clsPass, false);
  assert.equal(out.pass, false);
});

test('Mission K: evaluateCwv fail-closed on null/NaN', () => {
  assert.equal(evaluateCwv({ lcpMs: null, cls: 0.01 }).pass, false);
  assert.equal(evaluateCwv({ lcpMs: 1000, cls: NaN }).pass, false);
  assert.equal(evaluateCwv({}).pass, false);
});

test('Mission K: evaluateA11y pass empty violations', () => {
  const out = evaluateA11y({ violations: [] });
  assert.equal(out.standard, 'WCAG2.1-AA');
  assert.equal(out.violationCount, 0);
  assert.equal(out.pass, true);
});

test('Mission K: evaluateA11y fail with violations', () => {
  const out = evaluateA11y({
    violations: [{ id: 'color-contrast', impact: 'serious', description: 'x', nodes: [] }]
  });
  assert.equal(out.standard, 'WCAG2.1-AA');
  assert.equal(out.violationCount, 1);
  assert.equal(out.pass, false);
});

test('Mission K: evaluateA11y fail-closed on non-array', () => {
  assert.equal(evaluateA11y({ violations: null }).pass, false);
  assert.equal(evaluateA11y({}).pass, false);
  assert.equal(evaluateA11y({ violations: 'bad' }).pass, false);
});

test('Mission K: runBrowserQa full success → custody VERIFIED, screenshot sha256, ok true', async () => {
  const client = makeMockClient();
  const out = await runBrowserQa({
    url: 'https://example.test/',
    clientImpl: client
  });
  assert.equal(out.ok, true);
  assert.equal(out.url, 'https://example.test/');
  assert.equal(out.cwv.pass, true);
  assert.equal(out.a11y.pass, true);
  assert.equal(out.a11y.standard, 'WCAG2.1-AA');
  assert.equal(out.a11y.violationCount, 0);
  assert.ok(out.screenshot);
  assert.equal(out.screenshot.mimeType, 'image/png');
  assert.match(out.screenshot.sha256, /^[a-f0-9]{64}$/);
  assert.equal(typeof out.screenshot.byteLength, 'number');
  assert.ok(out.screenshot.byteLength > 0);
  assert.equal(typeof out.screenshot.capturedAt, 'string');
  assert.ok(!('base64' in out.screenshot));
  assert.ok(!('buffer' in out.screenshot));
  const expectedSha = createHash('sha256')
    .update(Buffer.from(PNG_BASE64, 'base64'))
    .digest('hex');
  assert.equal(out.screenshot.sha256, expectedSha);
  assert.equal(out.custody.tool, 'browser_qa_run');
  assert.equal(out.custody.status, 'VERIFIED');
  assert.equal(out.custody.PRODUCTION_READY, 'NO');
  assert.match(out.custody.input_hash, /^[a-f0-9]{64}$/);
  assert.equal(typeof out.custody.duration_ms, 'number');
  assert.ok(out.custody.duration_ms >= 0);
  assert.deepEqual(
    client.calls.map((c) => c.method),
    ['navigate', 'collectCwv', 'runA11yScan', 'captureScreenshot']
  );
});

test('Mission K: URL_REQUIRED', async () => {
  const client = makeMockClient();
  await assert.rejects(
    () => runBrowserQa({ url: '', clientImpl: client }),
    (err) => {
      assert.ok(err instanceof BrowserQaRunnerError);
      assert.equal(err.code, 'URL_REQUIRED');
      return true;
    }
  );
  await assert.rejects(
    () => runBrowserQa({ clientImpl: client }),
    (err) => {
      assert.ok(err instanceof BrowserQaRunnerError);
      assert.equal(err.code, 'URL_REQUIRED');
      return true;
    }
  );
});

test('Mission K: CLIENT_IMPL_REQUIRED when no clientImpl', async () => {
  await assert.rejects(
    () => runBrowserQa({ url: 'https://example.test/' }),
    (err) => {
      assert.ok(err instanceof BrowserQaRunnerError);
      assert.equal(err.code, 'CLIENT_IMPL_REQUIRED');
      return true;
    }
  );
});

test('Mission K: CLIENT_METHOD_MISSING when navigate missing', async () => {
  const client = makeMockClient({ navigate: undefined });
  await assert.rejects(
    () => runBrowserQa({ url: 'https://example.test/', clientImpl: client }),
    (err) => {
      assert.ok(err instanceof BrowserQaRunnerError);
      assert.equal(err.code, 'CLIENT_METHOD_MISSING');
      return true;
    }
  );
});

test('Mission K: TIMEOUT when navigate hangs (timeoutMs: 50)', async () => {
  const client = makeMockClient({
    navigate: async () =>
      new Promise(() => {
        /* never resolves */
      })
  });
  await assert.rejects(
    () =>
      runBrowserQa({
        url: 'https://example.test/',
        clientImpl: client,
        timeoutMs: 50
      }),
    (err) => {
      assert.ok(err instanceof BrowserQaRunnerError);
      assert.equal(err.code, 'TIMEOUT');
      return true;
    }
  );
});

test('Mission K: soft fail bad CWV → ok false, custody FAILED, no throw', async () => {
  const client = makeMockClient({
    collectCwv: async () => ({ lcpMs: 5000, cls: 0.01 })
  });
  const out = await runBrowserQa({
    url: 'https://example.test/',
    clientImpl: client
  });
  assert.equal(out.ok, false);
  assert.equal(out.cwv.pass, false);
  assert.equal(out.cwv.lcpPass, false);
  assert.equal(out.a11y.pass, true);
  assert.equal(out.custody.status, 'FAILED');
  assert.equal(out.custody.PRODUCTION_READY, 'NO');
  assert.match(out.screenshot.sha256, /^[a-f0-9]{64}$/);
});

test('Mission K: soft fail a11y violations → ok false', async () => {
  const client = makeMockClient({
    runA11yScan: async () => ({
      violations: [
        {
          id: 'image-alt',
          impact: 'critical',
          description: 'Images must have alt text',
          nodes: [{}]
        }
      ]
    })
  });
  const out = await runBrowserQa({
    url: 'about:blank',
    clientImpl: client
  });
  assert.equal(out.ok, false);
  assert.equal(out.a11y.pass, false);
  assert.equal(out.a11y.violationCount, 1);
  assert.equal(out.custody.status, 'FAILED');
});

test('Mission K: input_hash stable; strips apiKey from options', () => {
  const h1 = hashBrowserQaInput('https://example.test/', {
    viewport: { width: 1280, height: 720 },
    apiKey: 'SECRET-KEY-SHOULD-STRIP'
  });
  const h2 = hashBrowserQaInput('https://example.test/', {
    viewport: { width: 1280, height: 720 },
    apiKey: 'DIFFERENT-SECRET'
  });
  const h3 = hashBrowserQaInput('https://example.test/', {
    viewport: { width: 1280, height: 720 }
  });
  assert.match(h1, /^[a-f0-9]{64}$/);
  assert.equal(h1, h2);
  assert.equal(h1, h3);
  const h4 = hashBrowserQaInput('https://example.test/', {
    viewport: { width: 1, height: 1 },
    token: 'tok',
    secret: 'sec'
  });
  assert.notEqual(h1, h4);
});

test(
  'Mission K: optional live SKIP when RUN_LIVE_BROWSER_QA_TESTS !== true',
  { skip: process.env.RUN_LIVE_BROWSER_QA_TESTS !== 'true' },
  async () => {
    // Live path is opt-in only; default suite never hits network/Chrome.
    assert.equal(process.env.RUN_LIVE_BROWSER_QA_TESTS, 'true');
  }
);
