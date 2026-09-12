/**
 * @file eos-ab-telemetry-server.test.js
 * @description SPEC-0033 / Mission AB — Live Streaming & Visual Telemetry Server.
 * Hermetic TDD: pure node:http SSE + optional JSON-RPC; loopback-only;
 * Law VI secret sanitization; never touch real Fundacion; not public internet ops.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: validates eos-telemetry-stream-server only.
 * not public internet ops; not PRODUCTION_READY; localhost-first only.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TELEMETRY_PRODUCTION_READY,
  TELEMETRY_KIND,
  TELEMETRY_EVENT_TYPES,
  TELEMETRY_CODES,
  TelemetryStreamServerError,
  createTelemetryStreamServer,
  sanitizeTelemetryPayload,
  isLoopbackHost
} from '../src/core/telemetry/telemetry-stream-server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.resolve(
  __dirname,
  '../src/core/telemetry/telemetry-stream-server.js'
);

/**
 * Read SSE frames until predicate or timeout.
 * @param {string} url
 * @param {{ timeoutMs?: number, until?: (frames: object[]) => boolean }} [opts]
 */
function openSse(url, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 3000;
  const until = opts.until;
  return new Promise((resolve, reject) => {
    const frames = [];
    let buffer = '';
    let settled = false;
    const req = http.get(url, { headers: { Accept: 'text/event-stream' } }, (res) => {
      if (res.statusCode !== 200) {
        settle(new Error(`SSE status ${res.statusCode}`));
        return;
      }
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buffer += chunk;
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const block of parts) {
          const eventMatch = /(?:^|\n)event:\s*(.+)/.exec(block);
          const dataMatch = /(?:^|\n)data:\s*(.+)/.exec(block);
          if (dataMatch) {
            let data;
            try {
              data = JSON.parse(dataMatch[1]);
            } catch {
              data = dataMatch[1];
            }
            frames.push({
              event: eventMatch ? eventMatch[1].trim() : 'message',
              data
            });
            if (until && until(frames)) {
              req.destroy();
              settle(null, { frames, res });
            }
          }
        }
      });
      res.on('error', (err) => settle(err));
    });
    req.on('error', (err) => settle(err));
    const timer = setTimeout(() => {
      req.destroy();
      settle(null, { frames, timedOut: true });
    }, timeoutMs);
    function settle(err, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(value);
    }
  });
}

/**
 * JSON-RPC POST helper.
 * @param {string} base
 * @param {string} method
 * @param {object} [params]
 */
async function rpc(base, method, params = {}) {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method,
    params
  });
  const url = new URL('/rpc', base);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── AB1 ──────────────────────────────────────────────────────────────────────
test('AB1 kind + PRODUCTION_READY NO', () => {
  assert.equal(TELEMETRY_PRODUCTION_READY, 'NO');
  assert.equal(TELEMETRY_KIND, 'eos-telemetry-stream-server');
  const s = createTelemetryStreamServer();
  assert.equal(s.kind, 'eos-telemetry-stream-server');
  assert.equal(s.PRODUCTION_READY, 'NO');
  assert.equal(s.health().PRODUCTION_READY, 'NO');
  assert.equal(s.health().kind, 'eos-telemetry-stream-server');
  assert.equal(s.getState().PRODUCTION_READY, 'NO');
  assert.equal(s.health().notProductionReady, true);
  assert.equal(s.health().publicBind, false);
  assert.equal(s.health().notPublicInternetOps, true);
  assert.equal(s.health().cloudAgent, false);
});

// ─── AB2 ──────────────────────────────────────────────────────────────────────
test('AB2 start binds 127.0.0.1 only', async () => {
  const s = createTelemetryStreamServer({ host: '127.0.0.1', port: 0 });
  const started = await s.start();
  try {
    assert.equal(started.ok, true);
    assert.equal(started.host, '127.0.0.1');
    assert.equal(started.PRODUCTION_READY, 'NO');
    assert.ok(Number.isInteger(started.port) && started.port > 0);
    assert.equal(s.getState().host, '127.0.0.1');
    assert.equal(s.getState().running, true);
    assert.equal(s.health().loopbackOnly, true);
    assert.equal(s.health().publicBind, false);
    assert.notEqual(started.host, '0.0.0.0');
  } finally {
    await s.stop();
  }
});

// ─── AB3 ──────────────────────────────────────────────────────────────────────
test('AB3 reject non-loopback host fail-closed', () => {
  assert.throws(
    () => createTelemetryStreamServer({ host: '0.0.0.0' }),
    (err) =>
      err instanceof TelemetryStreamServerError &&
      err.code === TELEMETRY_CODES.NON_LOOPBACK_HOST
  );
  assert.throws(
    () => createTelemetryStreamServer({ host: '192.168.1.10' }),
    (err) => err.code === TELEMETRY_CODES.NON_LOOPBACK_HOST
  );
  assert.throws(
    () => createTelemetryStreamServer({ host: '8.8.8.8' }),
    (err) => err.code === TELEMETRY_CODES.NON_LOOPBACK_HOST
  );
  assert.equal(isLoopbackHost('127.0.0.1'), true);
  assert.equal(isLoopbackHost('::1'), true);
  assert.equal(isLoopbackHost('localhost'), true);
  assert.equal(isLoopbackHost('0.0.0.0'), false);
  assert.equal(isLoopbackHost(''), false);
  assert.equal(isLoopbackHost(null), false);
});

// ─── AB4 ──────────────────────────────────────────────────────────────────────
test('AB4 SSE client receives published session.state', async () => {
  const s = createTelemetryStreamServer({ host: '127.0.0.1', port: 0 });
  const { port } = await s.start();
  try {
    const url = `http://127.0.0.1:${port}/events`;
    const waiter = openSse(url, {
      timeoutMs: 2500,
      until: (frames) =>
        frames.some(
          (f) =>
            f.event === 'session.state' ||
            (f.data && f.data.type === 'session.state')
        )
    });
    await sleep(80);
    const pub = s.publish('session.state', {
      sessionId: 'sess-ab4',
      phase: 'ACTIVE',
      PRODUCTION_READY: 'NO'
    });
    assert.equal(pub.ok, true);
    assert.equal(pub.code, TELEMETRY_CODES.PUBLISHED);
    const { frames } = await waiter;
    const hit = frames.find(
      (f) =>
        f.event === 'session.state' ||
        (f.data && f.data.type === 'session.state')
    );
    assert.ok(hit, `expected session.state frame, got ${JSON.stringify(frames)}`);
    assert.equal(hit.data.payload.sessionId, 'sess-ab4');
    assert.equal(hit.data.PRODUCTION_READY, 'NO');
  } finally {
    await s.stop();
  }
});

// ─── AB5 ──────────────────────────────────────────────────────────────────────
test('AB5 agent.step / fdir.cycle / custody.receipt broadcast', async () => {
  const s = createTelemetryStreamServer({ host: '127.0.0.1', port: 0 });
  const { port } = await s.start();
  try {
    const url = `http://127.0.0.1:${port}/v1/stream`;
    const needed = new Set([
      TELEMETRY_EVENT_TYPES.AGENT_STEP,
      TELEMETRY_EVENT_TYPES.FDIR_CYCLE,
      TELEMETRY_EVENT_TYPES.CUSTODY_RECEIPT
    ]);
    const waiter = openSse(url, {
      timeoutMs: 3000,
      until: (frames) => {
        const got = new Set(
          frames
            .filter((f) => f.data && f.data.type)
            .map((f) => f.data.type)
        );
        return [...needed].every((t) => got.has(t));
      }
    });
    await sleep(80);
    s.publish('agent.step', { agentId: 'a1', step: 'plan' });
    s.publish('fdir.cycle', { cycle: 1, status: 'OK' });
    s.publish('custody.receipt', {
      prevHash: '0'.repeat(64),
      sha256: 'a'.repeat(64)
    });
    const { frames } = await waiter;
    const types = new Set(
      frames.filter((f) => f.data && f.data.type).map((f) => f.data.type)
    );
    assert.ok(types.has('agent.step'), 'missing agent.step');
    assert.ok(types.has('fdir.cycle'), 'missing fdir.cycle');
    assert.ok(types.has('custody.receipt'), 'missing custody.receipt');
  } finally {
    await s.stop();
  }
});

// ─── AB6 ──────────────────────────────────────────────────────────────────────
test('AB6 secret sanitizer redacts token/password fields', () => {
  const dirty = {
    token: 'super-secret-token-value',
    password: 'hunter2',
    api_key: 'ak_live_abc',
    apiKey: 'ak_live_def',
    authorization: 'Bearer xyz',
    credential: 'cred-1',
    nested: { secret: 'nested-secret', ok: 'visible' },
    safe: 'hello',
    longB64: 'A'.repeat(48)
  };
  const clean = sanitizeTelemetryPayload(dirty);
  assert.equal(clean.token, '[REDACTED]');
  assert.equal(clean.password, '[REDACTED]');
  assert.equal(clean.api_key, '[REDACTED]');
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.authorization, '[REDACTED]');
  assert.equal(clean.credential, '[REDACTED]');
  assert.equal(clean.nested.secret, '[REDACTED]');
  assert.equal(clean.nested.ok, 'visible');
  assert.equal(clean.safe, 'hello');
  assert.equal(clean.longB64, '[REDACTED]');
  // Original untouched (deep clone)
  assert.equal(dirty.token, 'super-secret-token-value');
  assert.equal(dirty.password, 'hunter2');
});

test('AB6b publish path applies sanitizer before broadcast', async () => {
  const s = createTelemetryStreamServer({ host: '127.0.0.1', port: 0 });
  const { port } = await s.start();
  try {
    const url = `http://127.0.0.1:${port}/events`;
    const waiter = openSse(url, {
      timeoutMs: 2500,
      until: (frames) =>
        frames.some((f) => f.data && f.data.type === 'shell.status')
    });
    await sleep(80);
    s.publish('shell.status', {
      token: 'leak-me',
      password: 'pw',
      status: 'idle'
    });
    const { frames } = await waiter;
    const hit = frames.find(
      (f) => f.data && f.data.type === 'shell.status'
    );
    assert.ok(hit);
    assert.equal(hit.data.payload.token, '[REDACTED]');
    assert.equal(hit.data.payload.password, '[REDACTED]');
    assert.equal(hit.data.payload.status, 'idle');
  } finally {
    await s.stop();
  }
});

// ─── AB7 ──────────────────────────────────────────────────────────────────────
test('AB7 stop closes clients / server', async () => {
  const s = createTelemetryStreamServer({ host: '127.0.0.1', port: 0 });
  const { port } = await s.start();
  const url = `http://127.0.0.1:${port}/events`;
  // Keep the raw socket open so getClients() still sees it (openSse destroys on until).
  const clientPromise = new Promise((resolve, reject) => {
    const req = http.get(url, { headers: { Accept: 'text/event-stream' } }, (res) => {
      assert.equal(res.statusCode, 200);
      res.on('data', () => {
        /* drain hello / keepalive */
      });
      resolve({ req, res });
    });
    req.on('error', reject);
    setTimeout(() => reject(new Error('AB7 connect timeout')), 2000);
  });
  const { req } = await clientPromise;
  await sleep(40);
  assert.ok(s.getClients().length >= 1, `expected ≥1 client, got ${s.getClients().length}`);
  const stopped = await s.stop();
  assert.equal(stopped.ok, true);
  assert.equal(stopped.code, TELEMETRY_CODES.STOPPED);
  assert.equal(s.getState().running, false);
  assert.equal(s.getClients().length, 0);
  try {
    req.destroy();
  } catch {
    /* ignore */
  }
  // Publish after stop must fail-closed
  assert.throws(
    () => s.publish('session.state', { x: 1 }),
    (err) => err.code === TELEMETRY_CODES.NOT_RUNNING
  );
});

// ─── AB8 ──────────────────────────────────────────────────────────────────────
test('AB8 publish before start fail-closed', () => {
  const s = createTelemetryStreamServer({ host: '127.0.0.1' });
  assert.throws(
    () => s.publish('session.state', { a: 1 }),
    (err) =>
      err instanceof TelemetryStreamServerError &&
      err.code === TELEMETRY_CODES.NOT_RUNNING
  );
  const soft = s.publish('session.state', { a: 1 }, { throwIfStopped: false });
  assert.equal(soft.ok, false);
  assert.equal(soft.code, TELEMETRY_CODES.NOT_RUNNING);
  assert.equal(soft.PRODUCTION_READY, 'NO');
});

// ─── AB9 ──────────────────────────────────────────────────────────────────────
test('AB9 health never claims PRODUCTION_READY yes / public bind', async () => {
  const s = createTelemetryStreamServer({ host: '127.0.0.1', port: 0 });
  const h0 = s.health();
  assert.equal(h0.PRODUCTION_READY, 'NO');
  assert.notEqual(h0.PRODUCTION_READY, 'YES');
  assert.equal(h0.publicBind, false);
  assert.equal(h0.notPublicInternetOps, true);
  assert.equal(h0.localhostFirstOnly, true);
  await s.start();
  try {
    const h1 = s.health();
    assert.equal(h1.PRODUCTION_READY, 'NO');
    assert.equal(h1.publicBind, false);
    assert.equal(h1.host, '127.0.0.1');
    assert.equal(h1.loopbackOnly, true);
    assert.equal(h1.fundacionDelta, 0);
    const src = JSON.stringify(h1);
    assert.ok(!/PRODUCTION_READY["']?\s*:\s*["']YES["']/i.test(src));
  } finally {
    await s.stop();
  }
});

// ─── AB10 ─────────────────────────────────────────────────────────────────────
test('AB10 NON-CLAIM source strings', () => {
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.match(src, /not public internet ops/i);
  assert.match(src, /not PRODUCTION_READY/);
  assert.match(src, /localhost-first only/i);
  assert.match(src, /PRODUCTION_READY:\s*'NO'|PRODUCTION_READY = 'NO'/);
  assert.match(src, /Fundacion Δ=0|fundacionDelta/);
  assert.doesNotMatch(src, /CloudAgent fleet|Cursor CloudAgent launch/i);
  assert.ok(
    src.includes("kind: 'eos-telemetry-stream-server'") ||
      src.includes("TELEMETRY_KIND = 'eos-telemetry-stream-server'")
  );
});

// ─── AB11 ─────────────────────────────────────────────────────────────────────
test('AB11 JSON-RPC ping/health if implemented', async () => {
  const s = createTelemetryStreamServer({ host: '127.0.0.1', port: 0 });
  const { port } = await s.start();
  const base = `http://127.0.0.1:${port}`;
  try {
    const ping = await rpc(base, 'ping');
    assert.equal(ping.jsonrpc, '2.0');
    assert.equal(ping.result.pong, true);
    assert.equal(ping.result.PRODUCTION_READY, 'NO');
    assert.equal(ping.result.kind, TELEMETRY_KIND);

    const health = await rpc(base, 'health');
    assert.equal(health.result.kind, TELEMETRY_KIND);
    assert.equal(health.result.PRODUCTION_READY, 'NO');
    assert.equal(health.result.publicBind, false);
    assert.equal(health.result.notPublicInternetOps, true);

    const sub = await rpc(base, 'subscribe');
    assert.equal(sub.result.ok, true);
    assert.equal(sub.result.PRODUCTION_READY, 'NO');
  } finally {
    await s.stop();
  }
});

// ─── AB12 ─────────────────────────────────────────────────────────────────────
test('AB12 multiple clients fan-out', async () => {
  const s = createTelemetryStreamServer({ host: '127.0.0.1', port: 0 });
  const { port } = await s.start();
  try {
    const url = `http://127.0.0.1:${port}/events`;
    const makeWaiter = () =>
      openSse(url, {
        timeoutMs: 3000,
        until: (frames) =>
          frames.some(
            (f) => f.data && f.data.type === 'session.state'
          )
      });
    const w1 = makeWaiter();
    const w2 = makeWaiter();
    const w3 = makeWaiter();
    await sleep(100);
    assert.ok(s.getClients().length >= 2, `clients=${s.getClients().length}`);
    s.publish('session.state', { fanout: true, n: 3 });
    const [r1, r2, r3] = await Promise.all([w1, w2, w3]);
    for (const r of [r1, r2, r3]) {
      const hit = r.frames.find(
        (f) => f.data && f.data.type === 'session.state'
      );
      assert.ok(hit, 'each client must receive session.state');
      assert.equal(hit.data.payload.fanout, true);
    }
  } finally {
    await s.stop();
  }
});
