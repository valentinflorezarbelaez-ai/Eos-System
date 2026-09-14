/**
 * @file eos-bh-mission-lifecycle-state-machine.test.js
 * @description SPEC-0065 / Mission BH — Mission Lifecycle State Machine.
 * Hermetic TDD (~16):
 * kind + PRODUCTION_READY NO; happy-path PROPOSED→OPEN→MEASURED→CLOSED
 * + chained receipts; illegal PROPOSED→MEASURED DENY; illegal OPEN→CLOSED
 * DENY; missing evidenceHash DENY; tamper-resistance; Law VI MODULE_DIR
 * CLEAN (src/core/mission only); NON-CLAIM; L17/L18/L19 never-reopen;
 * terminal CLOSED deny; deterministic hash; getHistory; empty/malformed DENY.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: FSM ≠ Jira/PM SaaS / ≠ distributed consensus/multi-region /
 * ≠ PRODUCTION_READY=YES; not BI–BL; Fundacion Δ=0;
 * BH_PRODUCTION_READY=NO; Antigravity-first; L17/L18/L19 CLOSED never reopen;
 * L20 OPEN (BH in progress; BI–BL pending);
 * Axis: Sovereign Mission Continuity & Operator Fabric.
 *
 * Law VI / CRITICAL: scan ONLY MODULE_DIR = src/core/mission
 * (the BH modules). Do NOT scan the whole tests/ directory.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BH_PRODUCTION_READY,
  BH_KIND,
  BH_CODES,
  BH_STATES,
  BH_TERMINAL_STATE,
  BH_ALLOWED_TRANSITIONS,
  BH_RECEIPT_KIND,
  BH_RECEIPT_PRODUCTION_READY,
  BH_POLICY_GATE_KIND,
  createMissionLifecycleStateMachine,
  stableStringify,
  sha256Canonical,
  buildTransitionReceipt,
  verifyTransitionReceipt,
  hashTransitionReceipt,
  canonicalTransitionSealBody,
  _resetReceiptSeqForTests
} from '../src/core/mission/mission-lifecycle-state-machine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
/** CRITICAL Law VI: MODULE_DIR only — never scan tests/ */
const MODULE_DIR = path.join(ROOT, 'src/core/mission');

const FIXED_NOW = () => '2026-09-14T18:00:00.000Z';

function makeSm(opts = {}) {
  _resetReceiptSeqForTests();
  return createMissionLifecycleStateMachine({
    now: opts.now || FIXED_NOW,
    hash: opts.hash,
    throwOnDeny: opts.throwOnDeny === true,
    ...opts
  });
}

// ── BH1: kind + PRODUCTION_READY NO + NON-CLAIM health ──────────────────────
test('BH1: kind eos-mission-lifecycle-state-machine and PRODUCTION_READY NO', () => {
  const sm = makeSm();
  assert.equal(sm.kind, BH_KIND);
  assert.equal(sm.kind, 'eos-mission-lifecycle-state-machine');
  assert.equal(sm.PRODUCTION_READY, 'NO');
  assert.equal(BH_PRODUCTION_READY, 'NO');
  const health = sm.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, BH_KIND);
  assert.equal(health.jiraPmSaas, false);
  assert.equal(health.distributedConsensus, false);
  assert.equal(health.multiRegion, false);
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
  assert.equal(health.bhInProgress, true);
  assert.equal(health.biPending, true);
  assert.equal(BH_RECEIPT_KIND, 'eos-mission-transition-receipt');
  assert.equal(BH_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(BH_POLICY_GATE_KIND, 'eos-mission-lifecycle-policy-gate');
  assert.equal(BH_TERMINAL_STATE, 'CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.deepEqual(
    [...BH_ALLOWED_TRANSITIONS.PROPOSED],
    ['OPEN']
  );
  assert.deepEqual(
    [...BH_ALLOWED_TRANSITIONS.OPEN],
    ['MEASURED']
  );
  assert.deepEqual(
    [...BH_ALLOWED_TRANSITIONS.MEASURED],
    ['CLOSED_FOR_LOCAL_GOVERNED_USE']
  );
  assert.deepEqual(
    [...BH_ALLOWED_TRANSITIONS.CLOSED_FOR_LOCAL_GOVERNED_USE],
    []
  );
});

// ── BH2: Happy path PROPOSED→OPEN→MEASURED→CLOSED + chained receipts ────────
test('BH2: happy path PROPOSED→OPEN→MEASURED→CLOSED_FOR_LOCAL_GOVERNED_USE + chained sealed receipts', () => {
  const sm = makeSm();
  sm.registerMission('m-happy', BH_STATES.PROPOSED);

  const t1 = sm.transition({
    missionId: 'm-happy',
    fromState: 'PROPOSED',
    toState: 'OPEN'
  });
  assert.equal(t1.ok, true);
  assert.equal(t1.code, BH_CODES.TRANSITION_OK);
  assert.equal(t1.state, 'OPEN');
  assert.ok(t1.receipt.sealed);
  assert.ok(t1.receipt.receiptId.startsWith('BH-RCPT-'));
  assert.match(t1.receipt.receiptHash, /^[a-f0-9]{64}$/);
  assert.equal(t1.receipt.prevReceiptHash, null);
  assert.equal(t1.PRODUCTION_READY, 'NO');
  assert.equal(t1.fundacionDelta, 0);

  const t2 = sm.transition({
    missionId: 'm-happy',
    fromState: 'OPEN',
    toState: 'MEASURED',
    evidenceHash: 'evd-abc123',
    prevReceiptHash: t1.receipt.receiptHash
  });
  assert.equal(t2.ok, true);
  assert.equal(t2.state, 'MEASURED');
  assert.equal(t2.receipt.prevReceiptHash, t1.receipt.receiptHash);
  assert.equal(t2.receipt.evidenceHash, 'evd-abc123');

  const t3 = sm.transition({
    missionId: 'm-happy',
    fromState: 'MEASURED',
    toState: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
    prevReceiptHash: t2.receipt.receiptHash
  });
  assert.equal(t3.ok, true);
  assert.equal(t3.state, 'CLOSED_FOR_LOCAL_GOVERNED_USE');
  assert.equal(t3.receipt.prevReceiptHash, t2.receipt.receiptHash);

  const hist = sm.getHistory('m-happy');
  assert.equal(hist.length, 3);
  assert.equal(hist[0].receiptHash, t1.receipt.receiptHash);
  assert.equal(hist[1].prevReceiptHash, hist[0].receiptHash);
  assert.equal(hist[2].prevReceiptHash, hist[1].receiptHash);
  assert.equal(sm.getMissionState('m-happy'), 'CLOSED_FOR_LOCAL_GOVERNED_USE');
});

// ── BH3: Illegal PROPOSED→MEASURED DENY ─────────────────────────────────────
test('BH3: illegal PROPOSED→MEASURED DENY + sealed receipt', () => {
  const sm = makeSm();
  sm.registerMission('m-ill-pm', BH_STATES.PROPOSED);
  const r = sm.transition({
    missionId: 'm-ill-pm',
    fromState: 'PROPOSED',
    toState: 'MEASURED',
    evidenceHash: 'evd-x'
  });
  assert.equal(r.ok, false);
  assert.equal(r.deny, true);
  assert.equal(r.denied, true);
  assert.equal(r.code, BH_CODES.ILLEGAL_TRANSITION);
  assert.ok(r.receipt.sealed);
  assert.equal(r.receipt.status, 'DENY');
  assert.ok(r.receipt.receiptId.startsWith('BH-RCPT-'));
  assert.equal(sm.getMissionState('m-ill-pm'), 'PROPOSED');
  assert.equal(r.PRODUCTION_READY, 'NO');
  assert.equal(r.fundacionDelta, 0);
});

// ── BH4: Illegal OPEN→CLOSED DENY ───────────────────────────────────────────
test('BH4: illegal OPEN→CLOSED_FOR_LOCAL_GOVERNED_USE DENY + sealed receipt', () => {
  const sm = makeSm();
  sm.registerMission('m-ill-oc', BH_STATES.OPEN);
  const r = sm.transition({
    missionId: 'm-ill-oc',
    fromState: 'OPEN',
    toState: 'CLOSED_FOR_LOCAL_GOVERNED_USE'
  });
  assert.equal(r.ok, false);
  assert.equal(r.denied, true);
  assert.equal(r.code, BH_CODES.ILLEGAL_TRANSITION);
  assert.ok(r.receipt.sealed);
  assert.equal(r.receipt.status, 'DENY');
  assert.equal(sm.getMissionState('m-ill-oc'), 'OPEN');
});

// ── BH5: Missing evidenceHash to MEASURED DENY ──────────────────────────────
test('BH5: missing evidenceHash OPEN→MEASURED DENY', () => {
  const sm = makeSm();
  sm.registerMission('m-no-evd', BH_STATES.OPEN);
  const r = sm.transition({
    missionId: 'm-no-evd',
    fromState: 'OPEN',
    toState: 'MEASURED'
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BH_CODES.MISSING_EVIDENCE_HASH);
  assert.ok(r.receipt.sealed);
  assert.equal(r.receipt.status, 'DENY');
  assert.equal(sm.getMissionState('m-no-evd'), 'OPEN');

  const r2 = sm.transition({
    missionId: 'm-no-evd',
    fromState: 'OPEN',
    toState: 'MEASURED',
    evidenceHash: ''
  });
  assert.equal(r2.ok, false);
  assert.equal(r2.code, BH_CODES.MISSING_EVIDENCE_HASH);
});

// ── BH6: Tamper-resistance / receipt hash verification ──────────────────────
test('BH6: tamper-resistance — verifyTransitionReceipt detects mutation', () => {
  const sm = makeSm();
  sm.registerMission('m-tamp', BH_STATES.PROPOSED);
  const r = sm.transition({
    missionId: 'm-tamp',
    fromState: 'PROPOSED',
    toState: 'OPEN'
  });
  assert.equal(r.ok, true);
  const v1 = verifyTransitionReceipt(r.receipt);
  assert.equal(v1.ok, true);
  assert.equal(v1.expected, r.receipt.receiptHash);

  const tampered = { ...r.receipt, toState: 'MEASURED' };
  const v2 = verifyTransitionReceipt(tampered);
  assert.equal(v2.ok, false);
  assert.match(v2.reason, /tamper|mismatch/i);

  const forged = { ...r.receipt, receiptHash: '0'.repeat(64) };
  const v3 = verifyTransitionReceipt(forged);
  assert.equal(v3.ok, false);

  // Recompute from canonical eight fields matches
  const recomputed = hashTransitionReceipt(
    canonicalTransitionSealBody(r.receipt)
  );
  assert.equal(recomputed, r.receipt.receiptHash);
});

// ── BH7: Law VI MODULE_DIR CLEAN (src/core/mission only) ─────────────────────
test('BH7: Law VI MODULE_DIR CLEAN — src/core/mission only', () => {
  assert.ok(fs.existsSync(MODULE_DIR), 'MODULE_DIR must exist');
  const files = fs
    .readdirSync(MODULE_DIR)
    .filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 3, 'expected ≥3 mission modules');

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
    // No delivery/ imports — Layer 0 mission only
    assert.equal(
      /from\s+['"].*delivery\//.test(text),
      false,
      `${f} must not import delivery/`
    );
    // No child_process / network
    assert.equal(
      /child_process|node:net|node:http|node:https|fetch\(/.test(text),
      false,
      `${f} must stay hermetic`
    );
  }

  // Directory must only contain mission modules (no delivery bleed)
  for (const f of files) {
    assert.match(f, /^mission-/);
  }
});

// ── BH8: PRODUCTION_READY=NO + NON-CLAIM strings on modules ─────────────────
test('BH8: PRODUCTION_READY=NO and NON-CLAIM markers present in MODULE_DIR', () => {
  const files = fs
    .readdirSync(MODULE_DIR)
    .filter((f) => f.endsWith('.js'));
  let sawPrNo = false;
  let sawNonClaim = false;
  let sawJira = false;
  let sawConsensus = false;
  for (const f of files) {
    const text = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    if (/PRODUCTION_READY:\s*NO|PRODUCTION_READY\s*=\s*['"]NO['"]/.test(text)) {
      sawPrNo = true;
    }
    if (/NON-CLAIM/.test(text)) sawNonClaim = true;
    if (/Jira\/PM SaaS|jiraPmSaas/.test(text)) sawJira = true;
    if (/distributed consensus|distributedConsensus/.test(text)) {
      sawConsensus = true;
    }
  }
  assert.equal(sawPrNo, true);
  assert.equal(sawNonClaim, true);
  assert.equal(sawJira, true);
  assert.equal(sawConsensus, true);
  assert.equal(BH_PRODUCTION_READY, 'NO');
});

// ── BH9: L17/L18/L19 never-reopen markers ───────────────────────────────────
test('BH9: L17/L18/L19 CLOSED never-reopen markers on health + sources', () => {
  const sm = makeSm();
  const h = sm.health();
  assert.equal(h.l17NeverReopen, true);
  assert.equal(h.l18NeverReopen, true);
  assert.equal(h.l19NeverReopen, true);
  assert.equal(h.ladder17, 'CLOSED');
  assert.equal(h.ladder18, 'CLOSED');
  assert.equal(h.ladder19, 'CLOSED');
  assert.equal(h.ladder20, 'OPEN');

  const facade = fs.readFileSync(
    path.join(MODULE_DIR, 'mission-lifecycle-state-machine.js'),
    'utf8'
  );
  assert.match(facade, /L17 CLOSED never reopen/);
  assert.match(facade, /L18 CLOSED never reopen/);
  assert.match(facade, /L19 CLOSED never reopen/);
  assert.match(facade, /L20 OPEN/);
  assert.match(facade, /Sovereign Mission Continuity & Operator Fabric/);
});

// ── BH10: Terminal CLOSED cannot leave ──────────────────────────────────────
test('BH10: terminal CLOSED_FOR_LOCAL_GOVERNED_USE deny any leave', () => {
  const sm = makeSm();
  sm.registerMission('m-term', BH_STATES.CLOSED_FOR_LOCAL_GOVERNED_USE);
  const r = sm.transition({
    missionId: 'm-term',
    fromState: 'CLOSED_FOR_LOCAL_GOVERNED_USE',
    toState: 'OPEN'
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BH_CODES.TERMINAL_CLOSED);
  assert.ok(r.receipt.sealed);
  assert.equal(r.receipt.status, 'DENY');
  assert.equal(
    sm.getMissionState('m-term'),
    'CLOSED_FOR_LOCAL_GOVERNED_USE'
  );
});

// ── BH11: Deterministic hash ────────────────────────────────────────────────
test('BH11: deterministic receipt hash for identical inputs', () => {
  _resetReceiptSeqForTests();
  const a = buildTransitionReceipt(
    {
      ok: true,
      code: 'TRANSITION_OK',
      missionId: 'm-det',
      fromState: 'PROPOSED',
      toState: 'OPEN',
      status: 'OK',
      prevReceiptHash: null
    },
    { now: FIXED_NOW }
  );
  _resetReceiptSeqForTests();
  const b = buildTransitionReceipt(
    {
      ok: true,
      code: 'TRANSITION_OK',
      missionId: 'm-det',
      fromState: 'PROPOSED',
      toState: 'OPEN',
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
});

// ── BH12: getHistory replay inspection ──────────────────────────────────────
test('BH12: getHistory returns sealed receipts in-memory (incl. DENY)', () => {
  const sm = makeSm();
  sm.registerMission('m-hist', BH_STATES.PROPOSED);
  sm.transition({
    missionId: 'm-hist',
    fromState: 'PROPOSED',
    toState: 'OPEN'
  });
  sm.transition({
    missionId: 'm-hist',
    fromState: 'OPEN',
    toState: 'CLOSED_FOR_LOCAL_GOVERNED_USE'
  }); // DENY — illegal edge; state still OPEN
  const hist = sm.getHistory('m-hist');
  assert.equal(hist.length, 2);
  assert.equal(hist[0].status, 'OK');
  assert.equal(hist[1].status, 'DENY');
  assert.equal(hist[1].code, BH_CODES.ILLEGAL_TRANSITION);
  assert.equal(sm.getHistory('no-such').length, 0);
  assert.equal(sm.getHistory('').length, 0);
});

// ── BH13: Empty missionId / malformed payload DENY ──────────────────────────
test('BH13: empty missionId and malformed payload DENY', () => {
  const sm = makeSm();
  const empty = sm.transition({
    missionId: '',
    fromState: 'PROPOSED',
    toState: 'OPEN'
  });
  assert.equal(empty.ok, false);
  assert.equal(empty.code, BH_CODES.EMPTY_MISSION_ID);
  assert.ok(empty.receipt.sealed);

  const missing = sm.transition({
    missionId: 'm-mal',
    fromState: 'PROPOSED'
    // toState missing
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, BH_CODES.MALFORMED_PAYLOAD);
  assert.ok(missing.receipt.sealed);

  const badState = sm.transition({
    missionId: 'm-bad',
    fromState: 'PROPOSED',
    toState: 'SHIPPED'
  });
  assert.equal(badState.ok, false);
  assert.equal(badState.code, BH_CODES.INVALID_STATE);

  const nullReq = sm.transition(null);
  assert.equal(nullReq.ok, false);
  assert.equal(nullReq.code, BH_CODES.MALFORMED_PAYLOAD);
});

// ── BH14: Auto-chain prevReceiptHash from last known ────────────────────────
test('BH14: auto-chain prevReceiptHash when omitted after prior OK', () => {
  const sm = makeSm();
  sm.registerMission('m-chain', BH_STATES.PROPOSED);
  const t1 = sm.transition({
    missionId: 'm-chain',
    fromState: 'PROPOSED',
    toState: 'OPEN'
  });
  const t2 = sm.transition({
    missionId: 'm-chain',
    fromState: 'OPEN',
    toState: 'MEASURED',
    evidenceHash: 'evd-auto'
    // prevReceiptHash omitted — machine supplies last
  });
  assert.equal(t2.ok, true);
  assert.equal(t2.receipt.prevReceiptHash, t1.receipt.receiptHash);
  assert.equal(sm.getLastReceiptHash('m-chain'), t2.receipt.receiptHash);
});

// ── BH15: Fundacion ALWAYS_DENY ─────────────────────────────────────────────
test('BH15: Fundacion path ALWAYS_DENY + sealed receipt', () => {
  const sm = makeSm();
  sm.registerMission('m-fund', BH_STATES.PROPOSED);
  const r = sm.transition({
    missionId: 'm-fund',
    fromState: 'PROPOSED',
    toState: 'OPEN',
    fundacion: true
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, BH_CODES.FUNDACION_DENY);
  assert.ok(r.receipt.sealed);
  assert.equal(r.fundacionDelta, 0);
});

// ── BH16: getState counters + STATES freeze ─────────────────────────────────
test('BH16: getState counters and BH_STATES / BH_CODES freeze', () => {
  const sm = makeSm();
  sm.registerMission('m-st', BH_STATES.PROPOSED);
  sm.transition({
    missionId: 'm-st',
    fromState: 'PROPOSED',
    toState: 'OPEN'
  });
  sm.transition({
    missionId: 'm-st',
    fromState: 'OPEN',
    toState: 'CLOSED_FOR_LOCAL_GOVERNED_USE'
  });
  const st = sm.getState();
  assert.equal(st.kind, BH_KIND);
  assert.equal(st.PRODUCTION_READY, 'NO');
  assert.equal(st.transitionCount, 2);
  assert.equal(st.okCount, 1);
  assert.equal(st.denyCount, 1);
  assert.equal(st.missions['m-st'], 'OPEN');
  assert.equal(BH_STATES.PROPOSED, 'PROPOSED');
  assert.equal(BH_STATES.OPEN, 'OPEN');
  assert.equal(BH_STATES.MEASURED, 'MEASURED');
  assert.equal(
    BH_STATES.CLOSED_FOR_LOCAL_GOVERNED_USE,
    'CLOSED_FOR_LOCAL_GOVERNED_USE'
  );
  assert.throws(() => {
    // @ts-ignore
    BH_STATES.PROPOSED = 'HACKED';
  });
  assert.equal(BH_CODES.ILLEGAL_TRANSITION, 'ILLEGAL_TRANSITION');
});
