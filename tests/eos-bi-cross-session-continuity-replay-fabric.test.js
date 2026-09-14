/**
 * @file eos-bi-cross-session-continuity-replay-fabric.test.js
 * @description SPEC-0066 / Mission BI — Cross-Session Continuity & Replay Fabric.
 * Hermetic TDD (~16):
 * kind + PRODUCTION_READY NO; happy-path handoff + sealed receipt chain;
 * tampered/divergent checkpoint DENY; deterministic replay match;
 * replay divergence DENY sealed failure; composition AT/AI/W/AL ports;
 * Law VI MODULE_DIR CLEAN (src/core/continuity only); NON-CLAIM; PR=NO;
 * L17/L18/L19 never-reopen; Fundacion DENY; empty/malformed; deterministic
 * hash; getState; BH MEASURED acknowledged / not BJ–BL.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: fabric ≠ HA multi-region SaaS / ≠ Raft/distributed clustering /
 * ≠ PRODUCTION_READY=YES; BH MEASURED acknowledged; not BJ–BL; Fundacion Δ=0;
 * BI_PRODUCTION_READY=NO; Antigravity-first; L17/L18/L19 CLOSED never reopen;
 * L20 OPEN (BH MEASURED; BI in progress; BJ–BL pending);
 * Axis: Sovereign Mission Continuity & Operator Fabric.
 *
 * Law VI / CRITICAL: scan ONLY MODULE_DIR = src/core/continuity
 * (the BI modules). Do NOT scan the whole tests/ directory.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BI_PRODUCTION_READY,
  BI_KIND,
  BI_CODES,
  BI_HANDOFF_STATUS,
  BI_RECEIPT_KIND,
  BI_RECEIPT_PRODUCTION_READY,
  BI_POLICY_GATE_KIND,
  createCrossSessionContinuityReplayFabric,
  stableStringify,
  sha256Canonical,
  buildContinuityReceipt,
  verifyContinuityReceipt,
  hashContinuityReceipt,
  canonicalContinuitySealBody,
  _resetReceiptSeqForTests
} from '../src/core/continuity/cross-session-continuity-replay-fabric.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/** CRITICAL Law VI: MODULE_DIR only — never scan tests/ */
const MODULE_DIR = path.join(ROOT, 'src/core/continuity');

const FIXED_NOW = () => '2026-09-14T19:00:00.000Z';

function makeFabric(opts = {}) {
  _resetReceiptSeqForTests();
  return createCrossSessionContinuityReplayFabric({
    now: opts.now || FIXED_NOW,
    hash: opts.hash,
    ports: opts.ports,
    throwOnDeny: opts.throwOnDeny === true,
    ...opts
  });
}

// ── BI1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('BI1: kind eos-cross-session-continuity-replay-fabric and PRODUCTION_READY NO', () => {
  const fab = makeFabric();
  assert.equal(fab.kind, BI_KIND);
  assert.equal(fab.kind, 'eos-cross-session-continuity-replay-fabric');
  assert.equal(fab.PRODUCTION_READY, 'NO');
  assert.equal(BI_PRODUCTION_READY, 'NO');
  const health = fab.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, BI_KIND);
  assert.equal(health.haMultiRegionSaas, false);
  assert.equal(health.raftDistributedClustering, false);
  assert.equal(health.productionReadyYes, false);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(health.fundacionDelta, 0);
  assert.equal(health.ladder17, 'CLOSED');
  assert.equal(health.ladder18, 'CLOSED');
  assert.equal(health.ladder19, 'CLOSED');
  assert.equal(health.ladder20, 'OPEN');
  assert.equal(health.l17NeverReopen, true);
  assert.equal(health.l18NeverReopen, true);
  assert.equal(health.l19NeverReopen, true);
  assert.equal(health.l17Status, 'CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.equal(health.l18Status, 'CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.equal(health.l19Status, 'CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.equal(health.axis, 'Sovereign Mission Continuity & Operator Fabric');
  assert.equal(health.bhMeasured, true);
  assert.equal(health.bhAcknowledged, true);
  assert.equal(health.biInProgress, true);
  assert.equal(health.bjPending, true);
  assert.equal(health.notBj, true);
  assert.equal(health.notBk, true);
  assert.equal(health.notBl, true);
  assert.equal(BI_RECEIPT_KIND, 'eos-cross-session-continuity-receipt');
  assert.equal(BI_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(BI_POLICY_GATE_KIND, 'eos-cross-session-continuity-policy-gate');
  assert.equal(BI_HANDOFF_STATUS.HANDOFF_OK, 'HANDOFF_OK');
});

// ── BI2: Happy-path handoff + sealed receipt chain ───────────────────────────
test('BI2: happy-path handoff + sealed receipt chain', () => {
  const fab = makeFabric();
  const cap = fab.captureCheckpoint({
    sessionId: 'sess-src',
    missionId: 'mission-bi-happy',
    state: { phase: 'OPEN' },
    events: [{ t: 1, op: 'start' }, { t: 2, op: 'step' }]
  });
  assert.equal(cap.ok, true);
  assert.equal(cap.code, BI_CODES.CAPTURE_OK);
  assert.ok(cap.checkpointHash);
  assert.ok(cap.receipt.sealed);
  assert.ok(cap.receipt.receiptId.startsWith('BI-RCPT-'));
  assert.match(cap.receipt.receiptHash, /^[a-f0-9]{64}$/);
  assert.equal(cap.receipt.handoffStatus, BI_HANDOFF_STATUS.CAPTURED);
  assert.equal(cap.PRODUCTION_READY, 'NO');
  assert.equal(cap.fundacionDelta, 0);

  const hand = fab.handoffSession({
    sourceSessionId: 'sess-src',
    targetSessionId: 'sess-tgt',
    missionId: 'mission-bi-happy',
    checkpointReceipt: cap.receipt,
    prevReceiptHash: cap.receipt.receiptHash
  });
  assert.equal(hand.ok, true);
  assert.equal(hand.code, BI_CODES.HANDOFF_OK);
  assert.equal(hand.targetSessionId, 'sess-tgt');
  assert.ok(hand.receipt.sealed);
  assert.ok(hand.receipt.receiptId.startsWith('BI-RCPT-'));
  assert.equal(hand.receipt.prevReceiptHash, cap.receipt.receiptHash);
  assert.equal(hand.receipt.handoffStatus, BI_HANDOFF_STATUS.HANDOFF_OK);
  assert.equal(hand.receipt.checkpointHash, cap.checkpointHash);

  const histSrc = fab.getHistory('sess-src');
  const histTgt = fab.getHistory('sess-tgt');
  assert.equal(histSrc.length, 1);
  assert.equal(histTgt.length, 1);
  assert.equal(histTgt[0].prevReceiptHash, histSrc[0].receiptHash);
  assert.equal(fab.getCheckpointHash('sess-tgt'), cap.checkpointHash);
});

// ── BI3: Tampered/divergent checkpoint → DENY ────────────────────────────────
test('BI3: tampered/divergent checkpoint → DENY + sealed failure', () => {
  const fab = makeFabric();
  const cap = fab.captureCheckpoint({
    sessionId: 'sess-tamp',
    missionId: 'm-tamp',
    events: [{ t: 1 }]
  });
  assert.equal(cap.ok, true);

  // Mutate checkpoint hash on receipt (tamper)
  const tampered = {
    ...cap.receipt,
    checkpointHash: 'deadbeef' + '0'.repeat(56)
  };
  const r = fab.handoffSession({
    sourceSessionId: 'sess-tamp',
    targetSessionId: 'sess-tamp-tgt',
    missionId: 'm-tamp',
    checkpointReceipt: tampered,
    expectCheckpointHash: cap.checkpointHash
  });
  assert.equal(r.ok, false);
  assert.equal(r.deny, true);
  assert.equal(r.denied, true);
  assert.ok(
    r.code === BI_CODES.CHECKPOINT_DIVERGENCE ||
      r.code === BI_CODES.TAMPERED_CHECKPOINT
  );
  assert.ok(r.receipt.sealed);
  assert.equal(r.receipt.status, 'DENY');
  assert.ok(r.receipt.receiptId.startsWith('BI-RCPT-'));
  assert.equal(r.PRODUCTION_READY, 'NO');
  assert.equal(r.fundacionDelta, 0);

  // Also verify verifyContinuityReceipt detects field mutation
  const v1 = verifyContinuityReceipt(cap.receipt);
  assert.equal(v1.ok, true);
  const forged = { ...cap.receipt, handoffStatus: 'HACKED' };
  const v2 = verifyContinuityReceipt(forged);
  assert.equal(v2.ok, false);
  assert.match(v2.reason, /tamper|mismatch/i);
});

// ── BI4: Deterministic replay match ──────────────────────────────────────────
test('BI4: deterministic replay match', () => {
  const fab = makeFabric();
  const events = [
    { t: 1, op: 'a' },
    { t: 2, op: 'b' },
    { t: 3, op: 'c' }
  ];
  const cap = fab.captureCheckpoint({
    sessionId: 'sess-replay',
    missionId: 'm-replay',
    state: { phase: 'OPEN' },
    events,
    cursor: 3
  });
  assert.equal(cap.ok, true);

  const replay = fab.replaySessionHistory({
    sessionId: 'sess-replay',
    missionId: 'm-replay',
    checkpointHash: cap.checkpointHash,
    historicalEvents: events,
    snapshot: cap.snapshot,
    prevReceiptHash: cap.receipt.receiptHash
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.code, BI_CODES.REPLAY_OK);
  assert.equal(replay.replayVerified, true);
  assert.ok(replay.receipt.sealed);
  assert.equal(replay.receipt.replayVerified, true);
  assert.equal(replay.receipt.handoffStatus, BI_HANDOFF_STATUS.REPLAY_OK);
  assert.equal(replay.receipt.prevReceiptHash, cap.receipt.receiptHash);
  assert.equal(replay.computedReplayHash, cap.checkpointHash);
  assert.equal(replay.PRODUCTION_READY, 'NO');
});

// ── BI5: Replay divergence → DENY sealed failure ─────────────────────────────
test('BI5: replay divergence → DENY sealed failure', () => {
  const fab = makeFabric();
  const cap = fab.captureCheckpoint({
    sessionId: 'sess-div',
    missionId: 'm-div',
    events: [{ t: 1, op: 'orig' }]
  });
  assert.equal(cap.ok, true);

  const bad = fab.replaySessionHistory({
    sessionId: 'sess-div',
    missionId: 'm-div',
    checkpointHash: cap.checkpointHash,
    historicalEvents: [{ t: 1, op: 'TAMPERED' }, { t: 99, op: 'extra' }],
    snapshot: {
      sessionId: 'sess-div',
      missionId: 'm-div',
      state: null,
      events: [{ t: 1, op: 'TAMPERED' }, { t: 99, op: 'extra' }],
      cursor: null
    },
    prevReceiptHash: cap.receipt.receiptHash
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.deny, true);
  assert.equal(bad.code, BI_CODES.REPLAY_DIVERGENCE);
  assert.ok(bad.receipt.sealed);
  assert.equal(bad.receipt.status, 'DENY');
  assert.equal(bad.receipt.replayVerified, false);
  assert.equal(bad.receipt.handoffStatus, BI_HANDOFF_STATUS.REPLAY_DENY);
  assert.equal(bad.PRODUCTION_READY, 'NO');
  assert.equal(bad.fundacionDelta, 0);
});

// ── BI6: Composition with AT/AI/W/AL mocks via ports ─────────────────────────
test('BI6: composition with AT/AI/W/AL mocks called via ports', () => {
  const calls = [];
  const ports = {
    atContinuity: (arg) => {
      calls.push(['atContinuity', arg.op]);
      return { ok: true };
    },
    aiMultiSession: (arg) => {
      calls.push(['aiMultiSession', arg.op]);
      return { ok: true };
    },
    wSession: (arg) => {
      calls.push(['wSession', arg.op]);
      return { ok: true };
    },
    alReplay: (arg) => {
      calls.push(['alReplay', arg.op]);
      return { ok: true };
    }
  };
  const fab = makeFabric({ ports });
  const cap = fab.captureCheckpoint({
    sessionId: 'sess-ports',
    missionId: 'm-ports',
    events: [{ t: 1 }]
  });
  assert.equal(cap.ok, true);
  assert.ok(calls.some(([n, op]) => n === 'atContinuity' && op === 'capture'));
  assert.ok(calls.some(([n, op]) => n === 'wSession' && op === 'capture'));

  const hand = fab.handoffSession({
    sourceSessionId: 'sess-ports',
    targetSessionId: 'sess-ports-tgt',
    missionId: 'm-ports',
    checkpointReceipt: cap.receipt,
    ports
  });
  assert.equal(hand.ok, true);
  assert.ok(calls.some(([n]) => n === 'aiMultiSession'));
  assert.ok(calls.some(([n, op]) => n === 'alReplay' && op === 'handoff-notify'));
  assert.ok(calls.some(([n, op]) => n === 'atContinuity' && op === 'handoff'));

  const replay = fab.replaySessionHistory({
    sessionId: 'sess-ports-tgt',
    missionId: 'm-ports',
    checkpointHash: cap.checkpointHash,
    historicalEvents: [{ t: 1 }],
    snapshot: {
      ...cap.snapshot,
      sessionId: 'sess-ports' // original snapshot session framing
    },
    // Use forceReplayMatch only if snapshot sessionId mismatch would diverge;
    // re-hash with original snapshot instead:
    ports
  });
  // snapshot still has sessionId sess-ports → hash matches cap
  assert.equal(replay.ok, true);
  assert.ok(calls.some(([n, op]) => n === 'alReplay' && op === 'replay'));
});

// ── BI7: Law VI MODULE_DIR CLEAN (src/core/continuity only) ───────────────────
test('BI7: Law VI MODULE_DIR CLEAN — src/core/continuity only', () => {
  assert.ok(fs.existsSync(MODULE_DIR), 'MODULE_DIR must exist');
  const files = fs
    .readdirSync(MODULE_DIR)
    .filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 3, 'expected ≥3 continuity modules');

  // Forbidden contiguous provider-prefix patterns (Law VI).
  // Split construction so this test file itself does not embed them.
  const forbidden = [
    'sk' + '-' + 'ant' + '-',
    'sk' + '-' + 'proj' + '-',
    'AKIA',
    'ghp' + '_',
    'xoxb' + '-',
    'xoxp' + '-'
  ];

  for (const f of files) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    for (const pat of forbidden) {
      assert.equal(
        text.includes(pat),
        false,
        `Law VI leak in ${f}: found ${pat}`
      );
    }
    // No delivery/ or mission/ imports — Layer 0 continuity only
    assert.equal(
      /from\s+['"].*delivery\//.test(text),
      false,
      `${f} must not import delivery/`
    );
    assert.equal(
      /from\s+['"].*\/mission\//.test(text),
      false,
      `${f} must not import mission/`
    );
    // No child_process / network
    assert.equal(
      /child_process|node:net|node:http|node:https|fetch\(/.test(text),
      false,
      `${f} must stay hermetic`
    );
  }

  // BI modules must use cross-session-continuity-* prefix; allow pre-existing
  // siblings in src/core/continuity/ (compose, don't require exclusive ownership).
  const biFiles = files.filter((f) => f.startsWith('cross-session-continuity-'));
  assert.ok(biFiles.length >= 3, 'expected ≥3 BI cross-session-continuity-* modules');
  for (const f of biFiles) {
    assert.match(f, /^cross-session-continuity-/);
  }
  // Pre-existing AT/continuity siblings may coexist; BI only owns cross-session-continuity-* files.
});

// ── BI8: PRODUCTION_READY=NO + NON-CLAIM strings on modules ──────────────────
test('BI8: PRODUCTION_READY=NO and NON-CLAIM markers present in MODULE_DIR', () => {
  const files = fs
    .readdirSync(MODULE_DIR)
    .filter((f) => f.endsWith('.js'));
  let sawPrNo = false;
  let sawNonClaim = false;
  let sawHa = false;
  let sawRaft = false;
  for (const f of files) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    if (/PRODUCTION_READY:\s*NO|PRODUCTION_READY\s*=\s*['"]NO['"]/.test(text)) {
      sawPrNo = true;
    }
    if (/NON-CLAIM/.test(text)) sawNonClaim = true;
    if (/HA multi-region|haMultiRegionSaas/.test(text)) sawHa = true;
    if (/Raft\/distributed|raftDistributedClustering/.test(text)) {
      sawRaft = true;
    }
  }
  assert.equal(sawPrNo, true);
  assert.equal(sawNonClaim, true);
  assert.equal(sawHa, true);
  assert.equal(sawRaft, true);
  assert.equal(BI_PRODUCTION_READY, 'NO');
});

// ── BI9: L17/L18/L19 never-reopen markers ────────────────────────────────────
test('BI9: L17/L18/L19 CLOSED never-reopen markers on health + sources', () => {
  const fab = makeFabric();
  const h = fab.health();
  assert.equal(h.l17NeverReopen, true);
  assert.equal(h.l18NeverReopen, true);
  assert.equal(h.l19NeverReopen, true);
  assert.equal(h.ladder17, 'CLOSED');
  assert.equal(h.ladder18, 'CLOSED');
  assert.equal(h.ladder19, 'CLOSED');
  assert.equal(h.ladder20, 'OPEN');
  assert.equal(h.bhMeasured, true);
  assert.equal(h.biInProgress, true);

  const facade = fs.readFileSync(
    path.join(MODULE_DIR, 'cross-session-continuity-replay-fabric.js'),
    'utf8'
  );
  assert.match(facade, /L17 CLOSED never reopen/);
  assert.match(facade, /L18 CLOSED never reopen/);
  assert.match(facade, /L19 CLOSED never reopen/);
  assert.match(facade, /L20 OPEN/);
  assert.match(facade, /Sovereign Mission Continuity & Operator Fabric/);
  assert.match(facade, /BH MEASURED/);
});

// ── BI10: Fundacion ALWAYS_DENY ──────────────────────────────────────────────
test('BI10: Fundacion path ALWAYS_DENY + sealed receipt', () => {
  const fab = makeFabric();
  const r = fab.captureCheckpoint({
    sessionId: 'sess-fund',
    missionId: 'm-fund',
    fundacion: true
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BI_CODES.FUNDACION_DENY);
  assert.ok(r.receipt.sealed);
  assert.equal(r.fundacionDelta, 0);

  const r2 = fab.handoffSession({
    sourceSessionId: 'a',
    targetSessionId: 'b',
    missionId: 'm',
    checkpointReceipt: { checkpointHash: 'abc' },
    writeFundacion: true
  });
  assert.equal(r2.ok, false);
  assert.equal(r2.code, BI_CODES.FUNDACION_DENY);
});

// ── BI11: Empty / malformed DENY ─────────────────────────────────────────────
test('BI11: empty sessionId/missionId and malformed payload DENY', () => {
  const fab = makeFabric();
  const empty = fab.captureCheckpoint({
    sessionId: '',
    missionId: 'm'
  });
  assert.equal(empty.ok, false);
  assert.equal(empty.code, BI_CODES.EMPTY_SESSION_ID);
  assert.ok(empty.receipt.sealed);

  const nullReq = fab.captureCheckpoint(null);
  assert.equal(nullReq.ok, false);
  assert.equal(nullReq.code, BI_CODES.MALFORMED_PAYLOAD);

  const noCp = fab.handoffSession({
    sourceSessionId: 'a',
    targetSessionId: 'b',
    missionId: 'm'
    // checkpointReceipt missing
  });
  assert.equal(noCp.ok, false);
  assert.equal(noCp.code, BI_CODES.MISSING_CHECKPOINT);

  const same = fab.handoffSession({
    sourceSessionId: 'same',
    targetSessionId: 'same',
    missionId: 'm',
    checkpointReceipt: { checkpointHash: 'x'.repeat(64) }
  });
  assert.equal(same.ok, false);
  assert.equal(same.code, BI_CODES.INVALID_HANDOFF);

  const noMission = fab.handoffSession({
    sourceSessionId: 'a',
    targetSessionId: 'b',
    missionId: '',
    checkpointReceipt: { checkpointHash: 'x'.repeat(64) }
  });
  assert.equal(noMission.ok, false);
  assert.equal(noMission.code, BI_CODES.EMPTY_MISSION_ID);

  const badReplay = fab.replaySessionHistory({
    checkpointHash: 'abc',
    historicalEvents: 'not-an-array'
  });
  assert.equal(badReplay.ok, false);
  assert.equal(badReplay.code, BI_CODES.MALFORMED_PAYLOAD);

  const missingHash = fab.replaySessionHistory({
    historicalEvents: []
  });
  assert.equal(missingHash.ok, false);
  assert.equal(missingHash.code, BI_CODES.MISSING_CHECKPOINT);
});

// ── BI12: Deterministic hash ─────────────────────────────────────────────────
test('BI12: deterministic receipt hash for identical inputs', () => {
  _resetReceiptSeqForTests();
  const a = buildContinuityReceipt(
    {
      ok: true,
      code: 'CAPTURE_OK',
      sessionId: 'sess-det',
      missionId: 'm-det',
      checkpointHash: 'c'.repeat(64),
      handoffStatus: 'CAPTURED',
      replayVerified: null,
      status: 'OK',
      prevReceiptHash: null
    },
    { now: FIXED_NOW }
  );
  _resetReceiptSeqForTests();
  const b = buildContinuityReceipt(
    {
      ok: true,
      code: 'CAPTURE_OK',
      sessionId: 'sess-det',
      missionId: 'm-det',
      checkpointHash: 'c'.repeat(64),
      handoffStatus: 'CAPTURED',
      replayVerified: null,
      status: 'OK',
      prevReceiptHash: null
    },
    { now: FIXED_NOW }
  );
  assert.equal(a.receiptHash, b.receiptHash);
  assert.equal(a.receiptId, b.receiptId);
  assert.equal(
    stableStringify({ b: 2, a: 1 }),
    stableStringify({ a: 1, b: 2 })
  );
  assert.equal(sha256Canonical({ a: 1 }), sha256Canonical({ a: 1 }));
  assert.equal(typeof a.receiptHash, 'string');
  assert.equal(a.receiptHash.length, 64);

  const recomputed = hashContinuityReceipt(
    canonicalContinuitySealBody(a)
  );
  assert.equal(recomputed, a.receiptHash);
});

// ── BI13: getState counters ──────────────────────────────────────────────────
test('BI13: getState counters after capture/handoff/deny', () => {
  const fab = makeFabric();
  fab.captureCheckpoint({
    sessionId: 'sess-st',
    missionId: 'm-st',
    events: []
  });
  fab.handoffSession({
    sourceSessionId: 'sess-st',
    targetSessionId: 'sess-st',
    missionId: 'm-st',
    checkpointReceipt: { checkpointHash: 'x' }
  }); // INVALID_HANDOFF (same ids)
  const st = fab.getState();
  assert.equal(st.kind, BI_KIND);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.equal(st.captureCount, 1);
  assert.equal(st.handoffCount, 1);
  assert.equal(st.okCount, 1);
  assert.equal(st.denyCount, 1);
  assert.ok(st.sessionCount >= 1);
});

// ── BI14: BH MEASURED acknowledged / not BJ–BL ───────────────────────────────
test('BI14: BH MEASURED acknowledged; not BJ–BL; L20 OPEN', () => {
  const fab = makeFabric();
  const h = fab.health();
  assert.equal(h.bhMeasured, true);
  assert.equal(h.bhAcknowledged, true);
  assert.equal(h.biInProgress, true);
  assert.equal(h.bjPending, true);
  assert.equal(h.bkPending, true);
  assert.equal(h.blPending, true);
  assert.equal(h.notBj, true);
  assert.equal(h.notBk, true);
  assert.equal(h.notBl, true);
  assert.equal(h.ladder20, 'OPEN');

  const facade = fs.readFileSync(
    path.join(MODULE_DIR, 'cross-session-continuity-replay-fabric.js'),
    'utf8'
  );
  assert.match(facade, /BH MEASURED/);
  assert.match(facade, /BJ–BL pending|not BJ–BL|bjPending/);
});

// ── BI15: Missing checkpoint DENY + auto-chain prevReceiptHash ───────────────
test('BI15: missing checkpoint DENY; auto-chain prevReceiptHash on capture→handoff', () => {
  const fab = makeFabric();
  const missing = fab.handoffSession({
    sourceSessionId: 's1',
    targetSessionId: 's2',
    missionId: 'm1',
    checkpointReceipt: { sealed: true }
    // no checkpointHash
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, BI_CODES.MISSING_CHECKPOINT);

  const cap = fab.captureCheckpoint({
    sessionId: 'chain-src',
    missionId: 'm-chain',
    events: [{ n: 1 }]
  });
  const hand = fab.handoffSession({
    sourceSessionId: 'chain-src',
    targetSessionId: 'chain-tgt',
    missionId: 'm-chain',
    checkpointReceipt: cap.receipt
    // prevReceiptHash omitted — fabric supplies last from source
  });
  assert.equal(hand.ok, true);
  assert.equal(hand.receipt.prevReceiptHash, cap.receipt.receiptHash);
  assert.equal(fab.getLastReceiptHash('chain-tgt'), hand.receipt.receiptHash);
});

// ── BI16: getHistory includes DENY; forceDivergence path ─────────────────────
test('BI16: getHistory includes DENY receipts; forceDivergence DENY', () => {
  const fab = makeFabric();
  const cap = fab.captureCheckpoint({
    sessionId: 'hist-src',
    missionId: 'm-hist',
    events: []
  });
  const denied = fab.handoffSession({
    sourceSessionId: 'hist-src',
    targetSessionId: 'hist-tgt',
    missionId: 'm-hist',
    checkpointReceipt: cap.receipt,
    forceDivergence: true
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.code, BI_CODES.CHECKPOINT_DIVERGENCE);
  assert.ok(denied.receipt.sealed);

  const histTgt = fab.getHistory('hist-tgt');
  assert.ok(histTgt.length >= 1);
  assert.equal(histTgt[histTgt.length - 1].status, 'DENY');
  assert.equal(fab.getHistory('no-such').length, 0);
  assert.equal(fab.getHistory('').length, 0);
  assert.equal(BI_CODES.CAPTURE_OK, 'CAPTURE_OK');
  assert.equal(BI_CODES.HANDOFF_OK, 'HANDOFF_OK');
  assert.equal(BI_CODES.REPLAY_OK, 'REPLAY_OK');
  assert.throws(() => {
    // @ts-ignore
    BI_CODES.CAPTURE_OK = 'HACKED';
  });
});
