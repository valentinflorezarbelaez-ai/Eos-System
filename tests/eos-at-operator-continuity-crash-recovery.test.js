/**
 * @file eos-at-operator-continuity-crash-recovery.test.js
 * @description SPEC-0051 / Mission AT — Operator Continuity / Crash-Recovery.
 * Hermetic TDD: checkpoint→crash→restart; tamper DENY; tip mismatch DENY;
 * conflicting custody heads DENY; MISSING_DEP; INVALID_REQUEST;
 * SECRET_LEAK_FORBIDDEN / Law VI; NON-CLAIM ≠ HA SaaS / ≠ multi-AZ /
 * ≠ CloudAgent; AT_PRODUCTION_READY=NO; Fundacion ALWAYS_DENY / Δ=0;
 * hermetic no fetch/http/CloudAgent; no partial apply on fail;
 * optional AN envelope continuity.
 * PRODUCTION_READY: NO
 *
 * Law VI / AF11 lesson: never put literal vendor key prefixes as static
 * string literals in source/tests — build synthetic fixtures at runtime.
 *
 * NON-CLAIM: continuity ≠ HA multi-region SaaS ≠ multi-AZ failover ≠
 * CloudAgent fleet recovery; not AU/AV/AW; Fundacion Δ=0;
 * AT_PRODUCTION_READY=NO.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AT_PRODUCTION_READY,
  AT_KIND,
  AT_CODES,
  AT_RECEIPT_KIND,
  AT_RECEIPT_PRODUCTION_READY,
  AT_SNAPSHOT_KIND,
  AT_SNAPSHOT_PRODUCTION_READY,
  AT_STORE_KIND,
  OperatorContinuityError,
  createOperatorContinuityCrashRecoveryPort,
  createContinuityCustodyStore,
  createAnEnvelopeContinuityAdapter,
  sanitizeAtPayload,
  defaultHash,
  stableStringify,
  buildContinuityReceipt,
  sealCustodySnapshot,
  verifyCustodySnapshot,
  projectAllowlistedState
} from '../src/core/continuity/operator-continuity-crash-recovery-port.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT_PATH = path.join(
  ROOT,
  'src/core/continuity/operator-continuity-crash-recovery-port.js'
);
const RECEIPT_PATH = path.join(
  ROOT,
  'src/core/continuity/continuity-receipt.js'
);
const SNAPSHOT_PATH = path.join(
  ROOT,
  'src/core/continuity/custody-snapshot.js'
);
const TEST_PATH = path.resolve(
  __dirname,
  'eos-at-operator-continuity-crash-recovery.test.js'
);

const TIP = '9139b159f42df391cf8e9c22d109fdfb74ad5739';

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

function makePort(opts = {}) {
  const store =
    opts.store ||
    createContinuityCustodyStore({
      hash: opts.hash || defaultHash,
      now: opts.now || (() => '2026-09-12T09:30:00.000Z')
    });
  return createOperatorContinuityCrashRecoveryPort({
    store,
    expectedTip: opts.expectedTip !== undefined ? opts.expectedTip : TIP,
    anEnvelope: opts.anEnvelope || null,
    requireStore: opts.requireStore !== false,
    rejectSecretsInRequest: opts.rejectSecretsInRequest !== false,
    failClosedPartialApply: opts.failClosedPartialApply !== false,
    now: opts.now || (() => '2026-09-12T09:30:00.000Z'),
    hash: opts.hash || defaultHash,
    throwOnDeny: opts.throwOnDeny === true
  });
}

// ── AT1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AT1: kind eos-operator-continuity-crash-recovery-port and PRODUCTION_READY NO', () => {
  const p = makePort();
  assert.equal(p.kind, AT_KIND);
  assert.equal(p.kind, 'eos-operator-continuity-crash-recovery-port');
  assert.equal(p.PRODUCTION_READY, 'NO');
  assert.equal(AT_PRODUCTION_READY, 'NO');
  const health = p.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, AT_KIND);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(AT_RECEIPT_KIND, 'eos-continuity-receipt');
  assert.equal(AT_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(AT_SNAPSHOT_KIND, 'eos-custody-snapshot');
  assert.equal(AT_SNAPSHOT_PRODUCTION_READY, 'NO');
  assert.equal(AT_STORE_KIND, 'eos-continuity-custody-store');
});

// ── AT2: checkpoint → crash → successful restart ────────────────────────────
test('AT2: checkpoint then crash then successful restart restores allowlisted state', () => {
  const p = makePort();
  const cp = p.checkpoint({
    sessionId: 'sess-at-1',
    tipPin: TIP,
    allowlistedState: { role: 'operator', lane: 'L17' },
    generation: 1
  });
  assert.equal(cp.ok, true);
  assert.equal(cp.code, AT_CODES.OK);
  assert.equal(cp.status, 'CHECKPOINTED');
  assert.ok(cp.checkpointId);
  assert.ok(cp.custodyDigest);
  assert.ok(cp.receipt.sealed);

  const crash = p.simulateCrash({ sessionId: 'sess-at-1' });
  assert.equal(crash.ok, true);
  assert.equal(crash.status, 'CRASHED');
  assert.equal(crash.liveCleared, true);
  assert.equal(crash.custodyOnDisk, true);
  assert.equal(p.getState().liveSessionCount, 0);

  const rs = p.restart({ sessionId: 'sess-at-1' });
  assert.equal(rs.ok, true);
  assert.equal(rs.code, AT_CODES.RESTART_OK);
  assert.equal(rs.status, 'RESTARTED');
  assert.equal(rs.sessionId, 'sess-at-1');
  assert.equal(rs.checkpointId, cp.checkpointId);
  assert.equal(rs.restored.sessionId, 'sess-at-1');
  assert.equal(rs.restored.allowlistedState.role, 'operator');
  assert.equal(rs.restored.allowlistedState.lane, 'L17');
  assert.ok(rs.receipt);
  assert.equal(rs.receipt.code, AT_CODES.RESTART_OK);
  assert.equal(rs.receipt.sealed, true);
  assert.equal(rs.haMultiRegionClaim, false);
  assert.equal(rs.multiAzFailoverClaim, false);
  assert.equal(rs.cloudAgentFleetClaim, false);
  assert.equal(rs.fundacionDelta, 0);
  assert.equal(p.getState().liveSessionCount, 1);
  assert.equal(p.getState().restartCount, 1);
});

// ── AT3: tamper DENY + receipt ──────────────────────────────────────────────
test('AT3: tamper DENY + sealed receipt', () => {
  const store = createContinuityCustodyStore({
    now: () => '2026-09-12T09:30:00.000Z'
  });
  const p = makePort({ store });
  const cp = p.checkpoint({
    sessionId: 'sess-tamper',
    tipPin: TIP,
    allowlistedState: { k: 'v' }
  });
  assert.equal(cp.ok, true);
  p.simulateCrash({ sessionId: 'sess-tamper' });

  // Corrupt sealed custody on "disk"
  assert.equal(store.tamper(cp.checkpointId, { allowlistedState: { k: 'EVIL' } }), true);

  const rs = p.restart({ sessionId: 'sess-tamper' });
  assert.equal(rs.ok, false);
  assert.equal(rs.code, AT_CODES.TAMPER_DETECTED);
  assert.ok(rs.receipt);
  assert.equal(rs.receipt.sealed, true);
  assert.equal(rs.receipt.forensic, true);
  assert.equal(rs.allow, false);
  // Live state must NOT have been restored
  assert.equal(p.getState().liveSessionCount, 0);
});

// ── AT4: tip mismatch DENY ──────────────────────────────────────────────────
test('AT4: tip mismatch DENY + sealed receipt', () => {
  const p = makePort({ expectedTip: TIP });
  const cp = p.checkpoint({
    sessionId: 'sess-tip',
    tipPin: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    allowlistedState: { ok: true }
  });
  assert.equal(cp.ok, true);
  p.simulateCrash({ sessionId: 'sess-tip' });

  const rs = p.restart({ sessionId: 'sess-tip', expectedTip: TIP });
  assert.equal(rs.ok, false);
  assert.equal(rs.code, AT_CODES.TIP_MISMATCH);
  assert.ok(rs.receipt);
  assert.equal(rs.receipt.forensic, true);
  assert.equal(rs.expectedTip, TIP);
  assert.equal(p.getState().liveSessionCount, 0);
});

// ── AT5: conflicting custody heads DENY ─────────────────────────────────────
test('AT5: conflicting custody heads DENY + sealed receipt', () => {
  const store = createContinuityCustodyStore({
    now: () => '2026-09-12T09:30:00.000Z'
  });
  const p = makePort({ store });
  const cp1 = p.checkpoint({
    sessionId: 'sess-conflict',
    tipPin: TIP,
    allowlistedState: { n: 1 }
  });
  assert.equal(cp1.ok, true);

  // Force a second head for same session (conflict fixture)
  store.forceExtraHead('sess-conflict', {
    sessionId: 'sess-conflict',
    tipPin: TIP,
    checkpointId: 'AT-CP-conflict-extra',
    allowlistedState: { sessionId: 'sess-conflict', n: 2, status: 'CHECKPOINTED', generation: 2 }
  });
  assert.ok(store.listHeads('sess-conflict').length >= 2);

  p.simulateCrash({ sessionId: 'sess-conflict' });
  const rs = p.restart({ sessionId: 'sess-conflict' });
  assert.equal(rs.ok, false);
  assert.equal(rs.code, AT_CODES.CUSTODY_CONFLICT);
  assert.ok(rs.receipt);
  assert.equal(rs.receipt.sealed, true);
  assert.ok(Array.isArray(rs.heads));
  assert.ok(rs.heads.length >= 2);
});

// ── AT6: MISSING_DEP ────────────────────────────────────────────────────────
test('AT6: MISSING_DEP when custody store injector absent', () => {
  const p = createOperatorContinuityCrashRecoveryPort({
    requireStore: true,
    store: null,
    now: () => '2026-09-12T09:30:00.000Z'
  });
  const cp = p.checkpoint({ sessionId: 'sess-missing', tipPin: TIP });
  assert.equal(cp.ok, false);
  assert.equal(cp.code, AT_CODES.MISSING_DEP);
  assert.ok(cp.missing.includes('store'));
  assert.ok(cp.receipt);

  const rs = p.restart({ sessionId: 'sess-missing' });
  assert.equal(rs.code, AT_CODES.MISSING_DEP);
});

// ── AT7: INVALID_REQUEST ────────────────────────────────────────────────────
test('AT7: INVALID_REQUEST on bad inputs', () => {
  const p = makePort();
  // @ts-expect-error intentional
  const a = p.checkpoint(null);
  assert.equal(a.ok, false);
  assert.equal(a.code, AT_CODES.INVALID_REQUEST);

  const b = p.checkpoint({});
  assert.equal(b.code, AT_CODES.INVALID_REQUEST);

  // @ts-expect-error intentional
  const c = p.simulateCrash('nope');
  assert.equal(c.code, AT_CODES.INVALID_REQUEST);

  const d = p.simulateCrash({ sessionId: 'never-existed' });
  assert.equal(d.code, AT_CODES.INVALID_REQUEST);

  // @ts-expect-error intentional
  const e = p.restart(null);
  assert.equal(e.code, AT_CODES.INVALID_REQUEST);

  const f = p.restart({});
  assert.equal(f.code, AT_CODES.INVALID_REQUEST);
});

// ── AT8: Law VI SECRET_LEAK_FORBIDDEN ───────────────────────────────────────
test('AT8: Law VI — secrets never in receipts; SECRET_LEAK_FORBIDDEN', () => {
  const p = makePort();
  const leak = p.checkpoint({
    sessionId: 'sess-leak',
    tipPin: TIP,
    apiKey: synthVendorKey(),
    persistSecrets: true
  });
  assert.equal(leak.ok, false);
  assert.equal(leak.code, AT_CODES.SECRET_LEAK_FORBIDDEN);
  assert.ok(leak.receipt);

  const bearer = p.restart({
    sessionId: 'sess-leak2',
    authorization: synthBearer(),
    includeSecretsInReceipt: true
  });
  assert.equal(bearer.code, AT_CODES.SECRET_LEAK_FORBIDDEN);

  const dirty = {
    token: synthVendorKey('testdatatestdatatestdata'),
    note: 'ok',
    nested: { password: 'hunter2-not-a-vendor-key-but-field' }
  };
  const clean = sanitizeAtPayload(dirty);
  assert.equal(clean.token, '[REDACTED]');
  assert.equal(clean.nested.password, '[REDACTED]');
  assert.equal(clean.note, 'ok');
});

// ── AT9: Law VI — no static vendor-key literals ─────────────────────────────
test('AT9: Law VI — no static vendor-key literals in payload sources (rg CLEAN)', () => {
  const files = [PORT_PATH, RECEIPT_PATH, SNAPSHOT_PATH, TEST_PATH];
  const vendorLiteral = String.fromCharCode(115, 107, 45); // s k -
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const staticLiteralRe = new RegExp(
      `['"\`]${vendorLiteral.replace('-', '\\-')}[A-Za-z0-9]`
    );
    assert.equal(
      staticLiteralRe.test(src),
      false,
      `static vendor-key literal found in ${path.basename(f)}`
    );
  }
});

// ── AT10: NON-CLAIM markers ─────────────────────────────────────────────────
test('AT10: NON-CLAIM ≠ HA SaaS / ≠ multi-AZ / ≠ CloudAgent / AT_PRODUCTION_READY=NO', () => {
  const src = fs.readFileSync(PORT_PATH, 'utf8');
  assert.match(src, /HA multi-region SaaS/i);
  assert.match(src, /multi-AZ failover/i);
  assert.match(src, /CloudAgent fleet recovery/i);
  assert.match(src, /Fundacion/);
  assert.match(src, /PRODUCTION_READY:\s*NO/);
  assert.match(src, /not AU\/AV\/AW/i);

  const p = makePort();
  const st = p.getState();
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.equal(st.haMultiRegionClaim, false);
  assert.equal(st.multiAzFailoverClaim, false);
  assert.equal(st.cloudAgentFleetClaim, false);
  assert.equal(st.nonClaim.continuityNotHaMultiRegionSaas, true);
  assert.equal(st.nonClaim.continuityNotMultiAzFailover, true);
  assert.equal(st.nonClaim.continuityNotCloudAgentFleetRecovery, true);
  assert.equal(st.nonClaim.notAuAvAw, true);
  assert.equal(st.nonClaim.atProductionReadyNo, true);
});

// ── AT11: Fundacion ALWAYS_DENY / Δ=0 ───────────────────────────────────────
test('AT11: Fundacion ALWAYS_DENY / Δ=0 — fundacion write targets denied', () => {
  const p = makePort();
  const a = p.checkpoint({
    sessionId: 'fund-1',
    tipPin: TIP,
    fundacion: true
  });
  assert.equal(a.ok, false);
  assert.equal(a.code, AT_CODES.FUNDACION_DENIED);
  assert.equal(a.fundacion, 'ALWAYS_DENY');
  assert.equal(a.fundacionDelta, 0);

  const b = p.restart({
    sessionId: 'fund-2',
    fundacionWrite: true,
    target: 'Documents/Fundacion/secret'
  });
  assert.equal(b.code, AT_CODES.FUNDACION_DENIED);

  const st = p.getState();
  assert.equal(st.fundacion, 'ALWAYS_DENY');
  assert.equal(st.fundacionDelta, 0);
});

// ── AT12: hermetic — no fetch/http/CloudAgent ───────────────────────────────
test('AT12: hermetic — no fetch/http; no CloudAgent; fail-closed codes present', () => {
  const src = fs.readFileSync(PORT_PATH, 'utf8');
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /\bhttp\.request\b/);
  assert.doesNotMatch(src, /\bhttps\.request\b/);
  assert.doesNotMatch(src, /CloudAgent\.launch/);
  assert.doesNotMatch(src, /from ['"]@cursor\/cloud-agent/);

  const expected = [
    'OK',
    'RESTART_OK',
    'TAMPER_DETECTED',
    'TIP_MISMATCH',
    'CUSTODY_CONFLICT',
    'MISSING_DEP',
    'INVALID_REQUEST',
    'SECRET_LEAK_FORBIDDEN',
    'FUNDACION_DENIED',
    'PARTIAL_APPLY_FORBIDDEN'
  ];
  for (const c of expected) {
    assert.equal(AT_CODES[c], c);
  }
});

// ── AT13: no partial apply on fail / WHILE recovery ─────────────────────────
test('AT13: no partial apply on fail — PARTIAL_APPLY_FORBIDDEN while recovery', () => {
  const p = makePort();
  p.checkpoint({
    sessionId: 'sess-partial',
    tipPin: TIP,
    allowlistedState: { x: 1 }
  });
  p.simulateCrash({ sessionId: 'sess-partial' });

  // Explicit partialApply flag during restart → DENY
  const rs = p.restart({
    sessionId: 'sess-partial',
    partialApply: true
  });
  assert.equal(rs.ok, false);
  assert.equal(rs.code, AT_CODES.PARTIAL_APPLY_FORBIDDEN);
  assert.ok(rs.receipt);
  assert.equal(p.getState().liveSessionCount, 0);

  // applyPartial surface always DENY
  const ap = p.applyPartial({ sessionId: 'sess-partial' });
  assert.equal(ap.code, AT_CODES.PARTIAL_APPLY_FORBIDDEN);
  assert.equal(ap.partialApply, false);
});

// ── AT14: optional AN envelope continuity ───────────────────────────────────
test('AT14: optional AN envelope continuity wrap + verify on restart', () => {
  const anEnvelope = createAnEnvelopeContinuityAdapter({
    now: () => '2026-09-12T09:30:00.000Z'
  });
  const p = makePort({ anEnvelope });
  const cp = p.checkpoint({
    sessionId: 'sess-an',
    tipPin: TIP,
    allowlistedState: { federated: true }
  });
  assert.equal(cp.ok, true);
  assert.ok(cp.envelope);
  assert.equal(cp.envelope.sealed, true);
  assert.ok(cp.envelope.digest);

  p.simulateCrash({ sessionId: 'sess-an' });
  const rs = p.restart({
    sessionId: 'sess-an',
    envelope: cp.envelope
  });
  assert.equal(rs.ok, true);
  assert.equal(rs.code, AT_CODES.RESTART_OK);

  // Tampered envelope → DENY
  const p2 = makePort({ anEnvelope });
  const cp2 = p2.checkpoint({
    sessionId: 'sess-an-bad',
    tipPin: TIP,
    allowlistedState: { federated: true }
  });
  p2.simulateCrash({ sessionId: 'sess-an-bad' });
  const badEnv = { ...cp2.envelope, digest: '0'.repeat(64) };
  const bad = p2.restart({ sessionId: 'sess-an-bad', envelope: badEnv });
  assert.equal(bad.ok, false);
  assert.equal(bad.code, AT_CODES.TAMPER_DETECTED);
});

// ── AT15: receipt helpers + snapshot seal/verify ────────────────────────────
test('AT15: continuity receipt + custody snapshot seal/verify helpers', () => {
  const snap = sealCustodySnapshot({
    sessionId: 'sess-helper',
    tipPin: TIP,
    checkpointId: 'AT-CP-helper01',
    allowlistedState: { sessionId: 'sess-helper', status: 'CHECKPOINTED', generation: 1 }
  });
  assert.equal(snap.sealed, true);
  assert.ok(snap.custodyDigest);
  const ok = verifyCustodySnapshot(snap);
  assert.equal(ok.ok, true);

  const tampered = { ...snap, allowlistedState: { sessionId: 'sess-helper', mutated: true } };
  const bad = verifyCustodySnapshot(tampered);
  assert.equal(bad.ok, false);
  assert.equal(bad.code, 'TAMPER_DETECTED');

  const rcpt = buildContinuityReceipt({
    ok: true,
    code: 'OK',
    phase: 'SEAL',
    sessionId: 'sess-helper',
    checkpointId: 'AT-CP-helper01'
  });
  assert.equal(rcpt.sealed, true);
  assert.ok(rcpt.receiptId.startsWith('AT-RCPT-'));
  assert.equal(rcpt.haMultiRegionClaim, false);

  const projected = projectAllowlistedState({
    sessionId: 's1',
    apiKey: 'should-not-be-allowlisted-field-name-only',
    allowlistedState: { role: 'op' },
    status: 'ACTIVE',
    generation: 3
  });
  assert.equal(projected.sessionId, 's1');
  assert.equal(projected.generation, 3);
  assert.equal(projected.apiKey, undefined);

  assert.equal(typeof stableStringify({ b: 1, a: 2 }), 'string');
  assert.equal(typeof defaultHash({ x: 1 }), 'string');
  assert.equal(defaultHash({ x: 1 }).length, 64);
});

// ── AT16: getState / health / OperatorContinuityError ───────────────────────
test('AT16: getState / health / throwOnDeny OperatorContinuityError', () => {
  const p = makePort();
  p.checkpoint({ sessionId: 'sess-st', tipPin: TIP });
  const st = p.getState();
  assert.equal(st.checkpointCount, 1);
  assert.equal(st.kind, AT_KIND);
  assert.equal(st.cloudAgent, false);
  assert.equal(st.partialApply, false);

  const h = p.health();
  assert.equal(h.ok, true);
  assert.equal(h.haMultiRegionClaim, false);

  const pThrow = makePort({ throwOnDeny: true });
  assert.throws(
    () => pThrow.checkpoint({}),
    (err) => {
      assert.ok(err instanceof OperatorContinuityError);
      assert.equal(err.code, AT_CODES.INVALID_REQUEST);
      return true;
    }
  );

  const receipts = p.getReceipts();
  assert.ok(receipts.length >= 1);
  assert.equal(receipts[0].sealed, true);
});

// ── AT17: restart without prior crash still works from disk custody ─────────
test('AT17: restart from disk custody without live session (cold restart)', () => {
  const store = createContinuityCustodyStore({
    now: () => '2026-09-12T09:30:00.000Z'
  });
  const p1 = makePort({ store });
  const cp = p1.checkpoint({
    sessionId: 'sess-cold',
    tipPin: TIP,
    allowlistedState: { cold: true }
  });
  // Simulate total process loss: new port instance, same store
  const p2 = makePort({ store });
  assert.equal(p2.getState().liveSessionCount, 0);
  const rs = p2.restart({ sessionId: 'sess-cold' });
  assert.equal(rs.ok, true);
  assert.equal(rs.code, AT_CODES.RESTART_OK);
  assert.equal(rs.checkpointId, cp.checkpointId);
  assert.equal(p2.getState().liveSessionCount, 1);
});

// ── AT18: AU/AV/AW not implemented markers ──────────────────────────────────
test('AT18: AU/AV/AW not implemented; Antigravity-first; no CloudAgent path', () => {
  const src = fs.readFileSync(PORT_PATH, 'utf8');
  assert.match(src, /not AU\/AV\/AW/);
  assert.match(src, /Antigravity-first/);
  assert.doesNotMatch(src, /CloudAgent\.launch/);
  assert.equal(AT_PRODUCTION_READY, 'NO');

  const p = makePort();
  const out = p.checkpoint({
    sessionId: 'sess-final',
    tipPin: TIP,
    allowlistedState: { done: true }
  });
  assert.equal(out.PRODUCTION_READY, 'NO');
  assert.equal(out.nonClaim.notAuAvAw, true);
  assert.equal(out.nonClaim.antigravityFirst, true);
  assert.equal(out.nonClaim.cloudAgentOut, true);
});
