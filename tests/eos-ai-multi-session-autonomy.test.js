/**
 * @file eos-ai-multi-session-autonomy.test.js
 * @description SPEC-0040 / Mission AI — Multi-Session Autonomy Coordinator.
 * Hermetic TDD: create/list; suspend/resume no drift; drift DENY;
 * unknown session; PRODUCTION_READY NO; Law VI no static vendor-key literals;
 * custody receipts; fail-closed; optional runCycle with fake loop.
 * PRODUCTION_READY: NO
 *
 * Law VI / AF11 lesson: never put literal vendor key prefixes as static
 * string literals in source/tests — build synthetic fixtures at runtime.
 *
 * NON-CLAIM: multi-session ≠ PRODUCTION_READY; ≠ unbounded autonomy product;
 * not AJ/AK/AL/AM; Fundacion Δ=0.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AI_PRODUCTION_READY,
  AI_KIND,
  AI_CODES,
  AI_SESSION_STATES,
  MultiSessionAutonomyError,
  createMultiSessionAutonomyCoordinator,
  createMemoryStore,
  sanitizeAiPayload,
  defaultHash,
  stableStringify
} from '../src/core/session/multi-session-autonomy-coordinator.js';
import {
  createSessionCustodyStore,
  AI_STORE_KIND
} from '../src/core/session/session-custody-store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COORD_PATH = path.join(
  ROOT,
  'src/core/session/multi-session-autonomy-coordinator.js'
);
const STORE_PATH = path.join(
  ROOT,
  'src/core/session/session-custody-store.js'
);
const TEST_PATH = path.resolve(
  __dirname,
  'eos-ai-multi-session-autonomy.test.js'
);

/**
 * Build a synthetic vendor-style key at runtime (Law VI — no static literals).
 */
function synthVendorKey(suffix = 'abcdefghijklmnopqrstuvwxyz012345') {
  const prefix = String.fromCharCode(115, 107, 45); // s k -
  return prefix + suffix;
}

/**
 * Build a Bearer token fixture at runtime.
 */
function synthBearer() {
  return 'Bearer ' + 'Z'.repeat(48);
}

function createFakeLoop(opts = {}) {
  let cycles = 0;
  const shouldFail = opts.fail === true;
  return {
    kind: 'eos-fake-af-loop',
    PRODUCTION_READY: 'NO',
    async runCycle(intent = {}) {
      cycles += 1;
      if (shouldFail) {
        return {
          ok: false,
          allow: false,
          code: 'DENY',
          kind: 'eos-fake-af-loop'
        };
      }
      return {
        ok: true,
        allow: true,
        code: 'COMPLETED',
        kind: 'eos-fake-af-loop',
        intent: intent.intent || 'default',
        sessionId: intent.sessionId
      };
    },
    getCycles: () => cycles
  };
}

function coord(opts = {}) {
  return createMultiSessionAutonomyCoordinator({
    loop: opts.loop,
    store: opts.store,
    hitl: opts.hitl,
    requireHitl: opts.requireHitl,
    resumeActiveIdempotent: opts.resumeActiveIdempotent,
    throwOnDeny: opts.throwOnDeny,
    now: opts.now,
    hash: opts.hash,
    onReceipt: opts.onReceipt,
    custodyStore: opts.custodyStore
  });
}

// ── AI1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AI1: kind eos-multi-session-autonomy-coordinator and PRODUCTION_READY NO', async () => {
  const c = coord();
  assert.equal(c.kind, AI_KIND);
  assert.equal(c.kind, 'eos-multi-session-autonomy-coordinator');
  assert.equal(c.PRODUCTION_READY, 'NO');
  assert.equal(AI_PRODUCTION_READY, 'NO');
  const h = await c.health();
  assert.equal(h.PRODUCTION_READY, 'NO');
  assert.equal(h.kind, AI_KIND);
  assert.equal(h.fundacionDelta, 0);
  assert.equal(h.cloudAgent, false);
  assert.equal(h.nonClaim.multiSessionNotProductionReady, true);
  assert.equal(h.nonClaim.notUnboundedAutonomyProduct, true);
  assert.equal(h.nonClaim.notAjAkAlAm, true);
});

// ── AI2: create + list ──────────────────────────────────────────────────────
test('AI2: createSession + listSessions', async () => {
  const c = coord();
  const created = await c.createSession({ label: 'alpha', purpose: 'hermetic' });
  assert.equal(created.ok, true);
  assert.equal(created.code, AI_CODES.CREATED);
  assert.ok(created.sessionId);
  assert.equal(created.state, AI_SESSION_STATES.ACTIVE);
  assert.equal(created.generation, 1);
  assert.ok(created.custodyDigest);
  assert.ok(created.snapshotHash);
  assert.ok(created.receipt);
  assert.equal(created.receipt.PRODUCTION_READY, 'NO');

  const listed = c.listSessions();
  assert.equal(listed.ok, true);
  assert.equal(listed.count, 1);
  assert.equal(listed.sessions[0].sessionId, created.sessionId);
  assert.equal(listed.sessions[0].state, 'ACTIVE');

  const got = c.getSession(created.sessionId);
  assert.equal(got.ok, true);
  assert.equal(got.session.generation, 1);
});

// ── AI3: suspend/resume roundtrip — no drift ────────────────────────────────
test('AI3: suspend/resume roundtrip restores custody chain — no drift', async () => {
  const c = coord();
  const created = await c.createSession({ label: 'roundtrip' });
  const sid = created.sessionId;
  const gen1 = created.generation;
  const digest1 = created.custodyDigest;

  const suspended = await c.suspendSession(sid);
  assert.equal(suspended.ok, true);
  assert.equal(suspended.code, AI_CODES.SUSPENDED);
  assert.equal(suspended.state, 'SUSPENDED');
  assert.equal(suspended.generation, gen1 + 1);
  assert.ok(suspended.snapshotHash);
  assert.ok(suspended.sealedSnapshot);
  assert.equal(suspended.sealedSnapshot.generation, suspended.generation);

  const resumed = await c.resumeSession(sid);
  assert.equal(resumed.ok, true);
  assert.equal(resumed.code, AI_CODES.RESUMED);
  assert.equal(resumed.state, 'ACTIVE');
  assert.equal(resumed.generation, suspended.generation + 1);
  // Prior custody restored into chain (no silent drift)
  assert.equal(resumed.restoredCustodyDigest, suspended.custodyDigest);
  assert.equal(resumed.restoredSnapshotHash, suspended.snapshotHash);
  assert.ok(resumed.custodyDigest);
  assert.notEqual(resumed.custodyDigest, digest1);

  const view = c.getSession(sid);
  assert.equal(view.session.state, 'ACTIVE');
  assert.equal(view.session.generation, resumed.generation);
  assert.ok(view.session.custodyChainLength >= 3); // CREATE + SUSPEND + RESUME
});

// ── AI4: drift DENY SESSION_DRIFT ───────────────────────────────────────────
test('AI4: tampered snapshot on resume → DENY SESSION_DRIFT fail-closed', async () => {
  const c = coord();
  const created = await c.createSession({ label: 'drift' });
  await c.suspendSession(created.sessionId);

  // Tamper generation / meta after seal → hash mismatch
  c._tamperForTest(created.sessionId, (rec) => {
    rec.generation = Number(rec.generation) + 99;
    rec.meta = { ...(rec.meta || {}), tampered: true };
  });

  const resumed = await c.resumeSession(created.sessionId);
  assert.equal(resumed.ok, false);
  assert.equal(resumed.allow, false);
  assert.equal(resumed.code, AI_CODES.SESSION_DRIFT);
  assert.ok(resumed.receipt);
  assert.equal(resumed.receipt.code, AI_CODES.SESSION_DRIFT);
});

// ── AI5: unknown session ────────────────────────────────────────────────────
test('AI5: unknown session → UNKNOWN_SESSION on suspend/resume/get/runCycle', async () => {
  const c = coord({ loop: createFakeLoop() });
  const bog = 'AI-SESS-does-not-exist';

  const s = await c.suspendSession(bog);
  assert.equal(s.code, AI_CODES.UNKNOWN_SESSION);
  assert.equal(s.ok, false);

  const r = await c.resumeSession(bog);
  assert.equal(r.code, AI_CODES.UNKNOWN_SESSION);

  const g = c.getSession(bog);
  assert.equal(g.code, AI_CODES.UNKNOWN_SESSION);
  assert.equal(g.session, null);

  const cy = await c.runCycle(bog, { intent: 'x' });
  assert.equal(cy.code, AI_CODES.UNKNOWN_SESSION);
});

// ── AI6: suspend twice fail-closed; resume active fail-closed ───────────────
test('AI6: suspend twice + resume active → INVALID_STATE fail-closed', async () => {
  const c = coord();
  const created = await c.createSession({ label: 'twice' });

  const s1 = await c.suspendSession(created.sessionId);
  assert.equal(s1.ok, true);

  const s2 = await c.suspendSession(created.sessionId);
  assert.equal(s2.ok, false);
  assert.equal(s2.code, AI_CODES.INVALID_STATE);

  // Resume then try resume again while ACTIVE
  const r1 = await c.resumeSession(created.sessionId);
  assert.equal(r1.ok, true);
  assert.equal(r1.state, 'ACTIVE');

  const r2 = await c.resumeSession(created.sessionId);
  assert.equal(r2.ok, false);
  assert.equal(r2.code, AI_CODES.INVALID_STATE);
});

// ── AI7: Law VI redact — runtime synth, no static vendor-key literals ───────
test('AI7: Law VI sanitize — redacts secrets (runtime synth); getState clean', async () => {
  const dirtyKey = synthVendorKey();
  const dirtyBearer = synthBearer();

  const c = coord();
  const created = await c.createSession({
    label: 'secrets',
    apiKey: dirtyKey,
    authorization: dirtyBearer,
    password: 'hunter2-not-a-product-secret',
    token: dirtyKey
  });
  assert.equal(created.ok, true);
  // Meta must be redacted in public views / receipts path
  const view = c.getSession(created.sessionId);
  assert.equal(view.session.meta.apiKey, '[REDACTED]');
  assert.equal(view.session.meta.authorization, '[REDACTED]');
  assert.equal(view.session.meta.password, '[REDACTED]');
  assert.equal(view.session.meta.token, '[REDACTED]');

  const state = c.getState();
  const dumped = JSON.stringify(state);
  assert.equal(dumped.includes(dirtyKey), false);
  assert.ok(
    dumped.includes('[REDACTED]') ||
      !dumped.includes(String.fromCharCode(115, 107, 45))
  );

  // Direct sanitize helper
  const clean = sanitizeAiPayload({
    apiKey: dirtyKey,
    authorization: dirtyBearer,
    nested: { token: dirtyKey, password: 'x', safe: 'ok' },
    generation: 3
  });
  assert.equal(clean.apiKey, '[REDACTED]');
  assert.equal(clean.authorization, '[REDACTED]');
  assert.equal(clean.nested.token, '[REDACTED]');
  assert.equal(clean.nested.password, '[REDACTED]');
  assert.equal(clean.nested.safe, 'ok');
  assert.equal(clean.generation, 3);

  const err = new MultiSessionAutonomyError(
    `leak ${dirtyKey}`,
    AI_CODES.DENY
  );
  assert.ok(err.message.includes('[REDACTED]') || !err.message.includes(dirtyKey));
});

// ── AI8: custody receipts on create/suspend/resume/runCycle ─────────────────
test('AI8: custody receipts on create/suspend/resume/runCycle', async () => {
  const seen = [];
  const loop = createFakeLoop();
  const c = coord({
    loop,
    onReceipt: (r) => seen.push(r)
  });

  const created = await c.createSession({ label: 'rcpt' });
  await c.suspendSession(created.sessionId);
  await c.resumeSession(created.sessionId);
  const cy = await c.runCycle(created.sessionId, { intent: 'ping' });
  assert.equal(cy.ok, true);
  assert.equal(cy.code, AI_CODES.CYCLE_COMPLETED);

  const receipts = c.getReceipts();
  assert.ok(receipts.length >= 4);
  const codes = receipts.map((r) => r.code);
  assert.ok(codes.includes(AI_CODES.CREATED));
  assert.ok(codes.includes(AI_CODES.SUSPENDED));
  assert.ok(codes.includes(AI_CODES.RESUMED));
  assert.ok(codes.includes(AI_CODES.CYCLE_COMPLETED));
  for (const r of receipts) {
    assert.equal(r.PRODUCTION_READY, 'NO');
    assert.equal(r.kind, AI_KIND);
    assert.ok(r.id);
    assert.ok(r.at);
  }
  assert.ok(seen.length >= 4);
});

// ── AI9: HITL requireHitl default deny ──────────────────────────────────────
test('AI9: requireHitl default DENY for privileged create', async () => {
  const c = coord({ requireHitl: true });
  const denied = await c.createSession({ label: 'hitl' });
  assert.equal(denied.ok, false);
  assert.equal(denied.code, AI_CODES.HITL_REQUIRED);
  assert.equal(denied.hitlRequired, true);

  const c2 = coord({
    requireHitl: true,
    hitl: { approve: async () => true }
  });
  const ok = await c2.createSession({ label: 'hitl-ok' });
  assert.equal(ok.ok, true);
  assert.equal(ok.code, AI_CODES.CREATED);
});

// ── AI10: injectable memory store persistence across coordinator instances ──
test('AI10: injectable store port — hermetic persistence fake across instances', async () => {
  const shared = createMemoryStore();
  const c1 = coord({ store: shared });
  const created = await c1.createSession({ label: 'shared' });
  await c1.suspendSession(created.sessionId);

  const c2 = coord({ store: shared });
  const listed = c2.listSessions();
  assert.equal(listed.count, 1);
  assert.equal(listed.sessions[0].sessionId, created.sessionId);
  assert.equal(listed.sessions[0].state, 'SUSPENDED');

  const resumed = await c2.resumeSession(created.sessionId);
  assert.equal(resumed.ok, true);
  assert.equal(resumed.state, 'ACTIVE');
});

// ── AI11: runCycle missing loop → MISSING_DEP; fake loop OK ─────────────────
test('AI11: runCycle without loop MISSING_DEP; with fake loop OK', async () => {
  const c0 = coord();
  const created = await c0.createSession({ label: 'noloop' });
  const missing = await c0.runCycle(created.sessionId, { intent: 'x' });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, AI_CODES.MISSING_DEP);

  const loop = createFakeLoop();
  const c = coord({ loop });
  const s = await c.createSession({ label: 'withloop' });
  const cy = await c.runCycle(s.sessionId, { intent: 'work' });
  assert.equal(cy.ok, true);
  assert.equal(cy.code, AI_CODES.CYCLE_COMPLETED);
  assert.equal(loop.getCycles(), 1);
  assert.equal(cy.session.cycleCount, 1);

  // Suspended session cannot runCycle
  await c.suspendSession(s.sessionId);
  const denied = await c.runCycle(s.sessionId, { intent: 'nope' });
  assert.equal(denied.code, AI_CODES.INVALID_STATE);
});

// ── AI12: Fundacion ALWAYS DENY ─────────────────────────────────────────────
test('AI12: Fundacion path intents → FUNDACION_DENY', async () => {
  const loop = createFakeLoop();
  const c = coord({ loop });
  const badMeta = await c.createSession({
    path: 'Documents/Fundacion/secret'
  });
  assert.equal(badMeta.code, AI_CODES.FUNDACION_DENY);

  const s = await c.createSession({ label: 'ok' });
  const badCycle = await c.runCycle(s.sessionId, {
    intent: 'write',
    fundacionWrite: true
  });
  assert.equal(badCycle.code, AI_CODES.FUNDACION_DENY);
});

// ── AI13: no network / hermetic source checks ───────────────────────────────
test('AI13: hermetic — no fetch/http client; no cloud-agent import path', () => {
  const src = fs.readFileSync(COORD_PATH, 'utf8');
  assert.equal(/\bfetch\s*\(/.test(src), false);
  assert.equal(/\bhttp\.request\b/.test(src), false);
  assert.equal(/from ['"]cloudagent/i.test(src), false);
  assert.equal(/require\(['"]cloudagent/i.test(src), false);
  assert.ok(src.includes('usesCloudAgent'));
  assert.ok(src.includes("PRODUCTION_READY"));
  assert.ok(src.includes("'NO'") || src.includes('"NO"'));
  assert.ok(src.includes('SESSION_DRIFT'));
  assert.ok(src.includes('UNKNOWN_SESSION'));
});

// ── AI14: payload sources have no static vendor-key literals ────────────────
test('AI14: Law VI — no static vendor-key literals in payload sources', () => {
  const files = [COORD_PATH, STORE_PATH, TEST_PATH];
  // Ban quoted literals that look like vendor API keys (built at runtime)
  const vendorLiteralRe = new RegExp(
    `['"]${String.fromCharCode(115, 107, 45)}[A-Za-z0-9]{8,}['"]`
  );
  for (const f of files) {
    const body = fs.readFileSync(f, 'utf8');
    assert.equal(
      vendorLiteralRe.test(body),
      false,
      `static vendor-key literal found in ${path.basename(f)}`
    );
  }
  // Runtime synth still works
  assert.ok(synthVendorKey().startsWith(String.fromCharCode(115, 107, 45)));
});

// ── AI15: custody store hash-chain + drift via digest tamper ────────────────
test('AI15: session-custody-store hash-chain + digest tamper → SESSION_DRIFT', async () => {
  const custody = createSessionCustodyStore();
  assert.equal(custody.kind, AI_STORE_KIND);
  assert.equal(custody.PRODUCTION_READY, 'NO');

  const store = createMemoryStore();
  const c = coord({ store, custodyStore: custody });
  const created = await c.createSession({ label: 'chain' });
  await c.suspendSession(created.sessionId);

  // Tamper custodyDigest while leaving sealedSnapshot pointing at old tip
  c._tamperForTest(created.sessionId, (rec) => {
    rec.custodyDigest = defaultHash({ evil: true, n: Math.random() });
  });

  const resumed = await c.resumeSession(created.sessionId);
  assert.equal(resumed.ok, false);
  assert.equal(resumed.code, AI_CODES.SESSION_DRIFT);

  // Fresh chain verify still OK for untampered session
  const c2 = coord({ custodyStore: createSessionCustodyStore() });
  const s2 = await c2.createSession({ label: 'clean-chain' });
  await c2.suspendSession(s2.sessionId);
  const ok = await c2.resumeSession(s2.sessionId);
  assert.equal(ok.ok, true);
});

// ── AI16: getState health metrics + stableStringify + resumeActiveIdempotent ─
test('AI16: getState metrics; stableStringify; resumeActiveIdempotent documented', async () => {
  assert.equal(
    stableStringify({ b: 1, a: 2 }),
    stableStringify({ a: 2, b: 1 })
  );

  const c = coord({ resumeActiveIdempotent: true });
  const created = await c.createSession({ label: 'idem' });
  const again = await c.resumeSession(created.sessionId);
  assert.equal(again.ok, true);
  assert.equal(again.idempotent, true);
  assert.equal(again.code, AI_CODES.RESUMED);

  const state = c.getState();
  assert.equal(state.PRODUCTION_READY, 'NO');
  assert.equal(state.metrics.sessionsCreated, 1);
  assert.equal(state.resumeActiveIdempotent, true);
  assert.equal(state.fundacion, 'ALWAYS_DENY');
  assert.equal(state.nonClaim.notAjAkAlAm, true);
});
