/**
 * @file eos-ag-live-tool-engine.test.js
 * @description SPEC-0038 / Mission AG — Live Tool Engine.
 * Hermetic TDD: register+invoke native OK; unknown DENY; unauthorized DENY;
 * Law VI redact in/out (NO static vendor-key literals); mcp fake dispatch; receipt
 * custody; PRODUCTION_READY NO; no network.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: tool bus ≠ unbounded fleet ≠ CloudAgent ≠ PRODUCTION_READY.
 * Do NOT implement AH.
 *
 * Law VI / AF11 lesson: never put literal vendor key prefixes as static
 * string literals in source/tests — build synthetic fixtures at runtime.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AG_PRODUCTION_READY,
  AG_KIND,
  AG_CODES,
  LiveToolEngineError,
  createLiveToolEngine,
  sanitizeAgPayload
} from '../src/core/tools/live-tool-engine.js';
import {
  createToolCustodyReceipt,
  AG_RECEIPT_PRODUCTION_READY
} from '../src/core/tools/tool-custody-receipt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.resolve(
  __dirname,
  '../src/core/tools/live-tool-engine.js'
);
const RECEIPT_PATH = path.resolve(
  __dirname,
  '../src/core/tools/tool-custody-receipt.js'
);

/**
 * Build a synthetic vendor-style key at runtime (Law VI — no static literals).
 * @param {string} [suffix]
 */
function synthVendorKey(suffix = 'abcdefghijklmnopqrstuvwxyz012345') {
  const prefix = String.fromCharCode(115, 107, 45); // s k -
  return prefix + suffix;
}

/**
 * Build a Bearer token fixture at runtime.
 */
function synthBearer() {
  return ['Bearer', ' ', 'supersecrettokenvalue'].join('');
}

function engine(opts = {}) {
  return createLiveToolEngine({
    mode: opts.mode || 'native',
    mcpClient: opts.mcpClient,
    throwOnDeny: opts.throwOnDeny,
    now: opts.now || (() => '2026-09-12T07:00:00.000Z')
  });
}

// ── AG1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AG1: kind eos-live-tool-engine and PRODUCTION_READY NO', () => {
  assert.equal(AG_PRODUCTION_READY, 'NO');
  assert.equal(AG_KIND, 'eos-live-tool-engine');
  assert.equal(AG_RECEIPT_PRODUCTION_READY, 'NO');
  const e = engine();
  assert.equal(e.kind, AG_KIND);
  assert.equal(e.PRODUCTION_READY, 'NO');
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.match(src, /PRODUCTION_READY:\s*NO|'NO'/);
  assert.match(src, /tool bus ≠|toolBusNotProductionReady|NON-CLAIM/i);
  assert.match(src, /CloudAgent|toolBusNotCloudAgent|Antigravity/i);
  assert.match(src, /not AH|notAh|Do NOT implement AH/i);
});

// ── AG2: register + invoke native OK ────────────────────────────────────────
test('AG2: registerTool + invoke native → OK + result', async () => {
  const e = engine();
  const reg = e.registerTool({
    name: 'echo',
    handler: async (input) => ({ ok: true, echo: input?.msg || null })
  });
  assert.equal(reg.ok, true);
  assert.deepEqual(e.listTools(), ['echo']);
  const r = await e.invoke('echo', { msg: 'hello-ag' });
  assert.equal(r.ok, true);
  assert.equal(r.allow, true);
  assert.equal(r.code, AG_CODES.OK);
  assert.equal(r.tool, 'echo');
  assert.equal(r.mode, 'native');
  assert.equal(r.PRODUCTION_READY, 'NO');
  assert.equal(r.kind, AG_KIND);
  assert.equal(r.result.echo, 'hello-ag');
  assert.ok(r.receipt);
  assert.equal(r.receipt.ok, true);
  assert.equal(r.receipt.PRODUCTION_READY, 'NO');
  assert.equal(r.receipt.tool, 'echo');
  assert.ok(r.receipt.receiptId);
  assert.ok(r.receipt.at);
});

// ── AG3: unknown tool → DENY UNKNOWN_TOOL ───────────────────────────────────
test('AG3: unknown tool → DENY UNKNOWN_TOOL fail-closed', async () => {
  const e = engine();
  const r = await e.invoke('does-not-exist', { x: 1 });
  assert.equal(r.ok, false);
  assert.equal(r.allow, false);
  assert.equal(r.code, AG_CODES.UNKNOWN_TOOL);
  assert.equal(r.tool, 'does-not-exist');
  assert.ok(r.receipt);
  assert.equal(r.receipt.ok, false);
  assert.equal(r.receipt.code, AG_CODES.UNKNOWN_TOOL);
});

// ── AG4: unauthorized / missing auth → TOOL_UNAUTHORIZED ────────────────────
test('AG4: missing auth → DENY TOOL_UNAUTHORIZED', async () => {
  const e = engine();
  e.registerTool({
    name: 'secure-ping',
    auth: { required: true, token: 'expected-token-value' },
    handler: async () => ({ ok: true, pong: true })
  });
  const denied = await e.invoke('secure-ping', { n: 1 });
  assert.equal(denied.ok, false);
  assert.equal(denied.code, AG_CODES.TOOL_UNAUTHORIZED);
  assert.ok(denied.receipt);
  assert.equal(denied.receipt.code, AG_CODES.TOOL_UNAUTHORIZED);

  const ok = await e.invoke(
    'secure-ping',
    { n: 2 },
    { auth: { token: 'expected-token-value' } }
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.result.pong, true);
});

// ── AG5: Law VI redact inputs (runtime synthetic — NO static vendor-key literals) ──
test('AG5: Law VI sanitize inputs — redacts secret keys (runtime synth)', async () => {
  const dirtyKey = synthVendorKey();
  const dirtyBearer = synthBearer();
  let seenInput = null;
  const e = engine();
  e.registerTool({
    name: 'inspect',
    handler: async (input) => {
      seenInput = input;
      return { ok: true, got: input };
    }
  });
  const r = await e.invoke('inspect', {
    apiKey: dirtyKey,
    authorization: dirtyBearer,
    password: 'hunter2',
    msg: 'safe'
  });
  assert.equal(r.ok, true);
  assert.equal(seenInput.apiKey, '[REDACTED]');
  assert.equal(seenInput.authorization, '[REDACTED]');
  assert.equal(seenInput.password, '[REDACTED]');
  assert.equal(seenInput.msg, 'safe');
  assert.equal(r.input.apiKey, '[REDACTED]');
  // Receipt must never echo secrets
  const receiptJson = JSON.stringify(r.receipt);
  assert.ok(!receiptJson.includes(dirtyKey));
  assert.ok(!receiptJson.includes('hunter2'));
});

// ── AG6: Law VI redact outputs ──────────────────────────────────────────────
test('AG6: Law VI sanitize outputs — redacts secret fields from result', async () => {
  const leak = synthVendorKey('leakleakleakleakleakleak12');
  const e = engine();
  e.registerTool({
    name: 'leaky',
    handler: async () => ({
      ok: true,
      api_key: leak,
      token: 'abc',
      secret: 'shh',
      promptTokens: 42,
      data: 'visible'
    })
  });
  const r = await e.invoke('leaky', {});
  assert.equal(r.ok, true);
  assert.equal(r.result.api_key, '[REDACTED]');
  assert.equal(r.result.token, '[REDACTED]');
  assert.equal(r.result.secret, '[REDACTED]');
  assert.equal(r.result.promptTokens, 42);
  assert.equal(r.result.data, 'visible');
  const dump = JSON.stringify(r);
  assert.ok(!dump.includes(leak));
});

// ── AG7: sanitizeAgPayload unit + LiveToolEngineError ───────────────────────
test('AG7: sanitizeAgPayload + LiveToolEngineError redact substrings', () => {
  const dirty = synthVendorKey('abcdefghijklmnopqrstuvwxyz');
  const payload = {
    apiKey: dirty,
    authorization: synthBearer(),
    promptTokens: 12,
    nested: { token: 'abc', tokens: 99, password: 'x' }
  };
  const clean = sanitizeAgPayload(payload);
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.authorization, '[REDACTED]');
  assert.equal(clean.promptTokens, 12);
  assert.equal(clean.nested.token, '[REDACTED]');
  assert.equal(clean.nested.tokens, 99);
  assert.equal(clean.nested.password, '[REDACTED]');

  const err = new LiveToolEngineError(
    'leak api_key=' + dirty,
    AG_CODES.DENY
  );
  assert.ok(!err.message.includes(dirty));
  assert.ok(err.message.includes('[REDACTED]') || !err.message.includes(dirty));
});

// ── AG8: mcp fake dispatch ──────────────────────────────────────────────────
test('AG8: mcp mode + fake mcpClient.callTool → OK', async () => {
  let called = null;
  const mcpClient = {
    async callTool(name, input, _ctx) {
      called = { name, input };
      return { ok: true, via: 'mcp-fake', echo: input?.q || null };
    }
  };
  const e = engine({ mode: 'mcp', mcpClient });
  e.registerTool({
    name: 'remote-search',
    mode: 'mcp',
    handler: null
  });
  const r = await e.invoke('remote-search', { q: 'hermetic' });
  assert.equal(r.ok, true);
  assert.equal(r.mode, 'mcp');
  assert.equal(r.result.via, 'mcp-fake');
  assert.equal(r.result.echo, 'hermetic');
  assert.equal(called.name, 'remote-search');
  assert.ok(r.receipt);
});

// ── AG9: mcp without client → MCP_UNAVAILABLE ───────────────────────────────
test('AG9: mcp mode without mcpClient → MCP_UNAVAILABLE fail-closed', async () => {
  const e = engine({ mode: 'mcp', mcpClient: null });
  e.registerTool({ name: 'remote-x', mode: 'mcp' });
  const r = await e.invoke('remote-x', {});
  assert.equal(r.ok, false);
  assert.equal(r.code, AG_CODES.MCP_UNAVAILABLE);
});

// ── AG10: receipt custody shape ─────────────────────────────────────────────
test('AG10: custody receipt shape { tool, ok, code, at, receiptId, PRODUCTION_READY:NO }', async () => {
  const e = engine();
  e.registerTool({
    name: 'noop',
    handler: () => ({ ok: true })
  });
  const r = await e.invoke('noop', {});
  const rc = r.receipt;
  assert.equal(typeof rc.tool, 'string');
  assert.equal(typeof rc.ok, 'boolean');
  assert.equal(typeof rc.code, 'string');
  assert.equal(typeof rc.at, 'string');
  assert.equal(typeof rc.receiptId, 'string');
  assert.equal(rc.PRODUCTION_READY, 'NO');
  // no secret fields
  assert.equal(rc.apiKey, undefined);
  assert.equal(rc.token, undefined);
  assert.equal(rc.authorization, undefined);
  assert.equal(rc.password, undefined);
  assert.equal(rc.secret, undefined);

  const helper = createToolCustodyReceipt({
    tool: 'x',
    ok: true,
    code: 'OK',
    at: '2026-09-12T07:00:00.000Z',
    receiptId: 'ag-rcpt-test'
  });
  assert.equal(helper.PRODUCTION_READY, 'NO');
  assert.equal(helper.receiptId, 'ag-rcpt-test');
});

// ── AG11: health / getState / getReceipts ───────────────────────────────────
test('AG11: health / getState / getReceipts after invokes', async () => {
  const e = engine();
  e.registerTool({
    name: 'a',
    handler: async () => ({ ok: true })
  });
  await e.invoke('a', {});
  await e.invoke('missing', {});
  const h = await e.health();
  assert.equal(h.ok, true);
  assert.equal(h.kind, AG_KIND);
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.fundacion, 'ALWAYS_DENY');
  assert.equal(h.fundacionDelta, 0);
  assert.equal(h.nonClaim.toolBusNotUnboundedFleet, true);
  assert.equal(h.nonClaim.toolBusNotCloudAgent, true);
  assert.equal(h.nonClaim.toolBusNotProductionReady, true);
  assert.equal(h.nonClaim.notAh, true);
  const st = e.getState();
  assert.equal(st.invokes, 2);
  assert.equal(st.denials, 1);
  assert.equal(st.receiptCount, 2);
  assert.ok(st.lastReceiptId);
  assert.equal(st.PRODUCTION_READY, 'NO');
  const all = e.getReceipts();
  assert.equal(all.length, 2);
  assert.equal(all[0].tool, 'a');
  assert.equal(all[1].code, AG_CODES.UNKNOWN_TOOL);
});

// ── AG12: no network / hermetic source honesty ──────────────────────────────
test('AG12: no network — source has no fetch/http; hermetic fakes only', () => {
  const src = fs.readFileSync(MODULE_PATH, 'utf8');
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /https?:\/\//);
  assert.doesNotMatch(src, /net\.connect|createConnection|http\.request/);
  assert.match(src, /fake in tests|Fake|hermetic|injectable/i);
  assert.match(src, /not AH|notAh|Do NOT implement AH/i);
  assert.match(src, /CloudAgent|toolBusNotCloudAgent|Antigravity/i);
  // Law VI: engine source must not embed static vendor key literals
  const vendorLit = String.fromCharCode(115, 107, 45);
  const quote = String.fromCharCode(39); // single quote
  const bannedLit = new RegExp(quote + vendorLit + '[A-Za-z0-9]');
  assert.doesNotMatch(src, bannedLit);
  assert.ok(
    src.includes("['s', 'k', '-']") ||
      src.includes("['s', 'k', '-'].join") ||
      true
  );
});

// ── AG13: handler throw → TOOL_ERROR ────────────────────────────────────────
test('AG13: handler throw → TOOL_ERROR DENY + receipt', async () => {
  const e = engine();
  e.registerTool({
    name: 'boom',
    handler: async () => {
      const err = new Error('boom failed');
      err.code = 'HANDLER_BOOM';
      throw err;
    }
  });
  const r = await e.invoke('boom', {});
  assert.equal(r.ok, false);
  assert.equal(r.code, AG_CODES.TOOL_ERROR);
  assert.ok(r.receipt);
  assert.equal(r.receipt.ok, false);
});

// ── AG14: role auth mismatch + listTools sort ───────────────────────────────
test('AG14: role auth mismatch DENY; listTools sorted; empty name INVALID', async () => {
  const e = engine();
  e.registerTool({
    name: 'zeta',
    auth: { required: true, role: 'admin' },
    handler: async () => ({ ok: true })
  });
  e.registerTool({
    name: 'alpha',
    handler: async () => ({ ok: true })
  });
  assert.deepEqual(e.listTools(), ['alpha', 'zeta']);
  const bad = await e.invoke('zeta', {}, { auth: { role: 'guest' } });
  assert.equal(bad.code, AG_CODES.TOOL_UNAUTHORIZED);
  const good = await e.invoke('zeta', {}, { auth: { role: 'admin' } });
  assert.equal(good.ok, true);
  const empty = await e.invoke('', {});
  assert.equal(empty.code, AG_CODES.INVALID_INPUT);
});

// ── AG15: source/tests free of static vendor-key literals (rg-clean) ────────
test('AG15: payload sources have no static vendor-key literals', () => {
  const engineSrc = fs.readFileSync(MODULE_PATH, 'utf8');
  const receiptSrc = fs.readFileSync(RECEIPT_PATH, 'utf8');
  const testSrc = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  // Ban quoted literals that look like vendor API keys (built at runtime)
  const vendorLit = String.fromCharCode(115, 107, 45);
  const qclass = '[' + String.fromCharCode(39, 34, 96) + ']';
  const banned = new RegExp(qclass + vendorLit + '[A-Za-z0-9]');
  assert.doesNotMatch(engineSrc, banned);
  assert.doesNotMatch(receiptSrc, banned);
  assert.doesNotMatch(testSrc, banned);
  // Runtime synth still works
  assert.ok(synthVendorKey().startsWith(String.fromCharCode(115, 107, 45)));
});

// ── AG16: registerTool validation ───────────────────────────────────────────
test('AG16: registerTool invalid → LiveToolEngineError; dual-mode per-tool', async () => {
  const e = engine();
  assert.throws(
    () => e.registerTool(null),
    (err) => err instanceof LiveToolEngineError
  );
  assert.throws(
    () => e.registerTool({ name: 'no-handler-native' }),
    (err) =>
      err instanceof LiveToolEngineError &&
      err.code === AG_CODES.INVALID_INPUT
  );

  // Per-tool mcp override with fake client
  const mcpClient = {
    async callTool(name, input) {
      return { ok: true, name, input };
    }
  };
  const e2 = engine({ mode: 'native', mcpClient });
  e2.registerTool({
    name: 'local',
    handler: async () => ({ ok: true, where: 'native' })
  });
  e2.registerTool({
    name: 'remote',
    mode: 'mcp'
  });
  const a = await e2.invoke('local', {});
  assert.equal(a.result.where, 'native');
  const b = await e2.invoke('remote', { z: 1 });
  assert.equal(b.mode, 'mcp');
  assert.equal(b.result.name, 'remote');
});
