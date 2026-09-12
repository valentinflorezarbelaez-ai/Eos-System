/**
 * @file eos-av-governed-state-freeze-drift-observer.test.js
 * @description SPEC-0053 / Mission AV — Governed State Freeze & Drift Observer
 * (Release Honesty / Freeze-Drift Observer). Hermetic TDD:
 * MATCHED; DRIFT_MEASURED; FREEZE_MATRIX_MISMATCH; fail-closed DENY;
 * observe-only report; INVALID_TIP; PRODUCTION_READY=NO; NON-CLAIM
 * (no auto-merge / no GH branch protection mutation); Fundacion Δ=0;
 * parse main_tip / evaluated_tip from sample fences.
 * PRODUCTION_READY: NO
 *
 * NON-CLAIM: observer ≠ auto-merge bot / ≠ GH required-check enforcement
 * / ≠ GH billing change; not AW; Fundacion Δ=0; AV_PRODUCTION_READY=NO;
 * Antigravity-first.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AV_PRODUCTION_READY,
  AV_KIND,
  AV_CODES,
  AV_RECEIPT_KIND,
  AV_RECEIPT_PRODUCTION_READY,
  AV_TIP_READER_KIND,
  AV_HONESTY_GATE_KIND,
  FreezeDriftObserverError,
  createFreezeDriftObserver,
  createTipPinReader,
  createHonestyGate,
  parseMainTip,
  parseEvaluatedTip,
  normalizeTip,
  defaultHash,
  stableStringify,
  buildDriftReceipt,
  evaluateHonestyGate
} from '../src/core/freeze-drift/governed-state-freeze-drift-observer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULE_DIR = path.join(ROOT, 'src/core/freeze-drift');

/** Hermetic full SHAs (not live tips — fixtures only). */
const TIP_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TIP_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const TIP_C = 'cccccccccccccccccccccccccccccccccccccccc';

const FREEZE_FENCE_A = [
  '```',
  `main_tip: ${TIP_A}`,
  'PRODUCTION_READY: NO',
  '```'
].join('\n');

const MATRIX_FENCE_A = [
  '```',
  `evaluated_tip: ${TIP_A}`,
  'matrix_version: 1',
  '```'
].join('\n');

const MATRIX_FENCE_B = [
  '```',
  `evaluated_tip: ${TIP_B}`,
  'matrix_version: 1',
  '```'
].join('\n');

function makeObserver(opts = {}) {
  return createFreezeDriftObserver({
    hash: opts.hash || defaultHash,
    now: opts.now || (() => '2026-09-12T09:50:00.000Z'),
    defaultMode: opts.defaultMode || 'observe',
    throwOnDeny: opts.throwOnDeny === true
  });
}

// ── AV1: kind + PRODUCTION_READY NO ─────────────────────────────────────────
test('AV1: kind eos-governed-state-freeze-drift-observer and PRODUCTION_READY NO', () => {
  const o = makeObserver();
  assert.equal(o.kind, AV_KIND);
  assert.equal(o.kind, 'eos-governed-state-freeze-drift-observer');
  assert.equal(o.PRODUCTION_READY, 'NO');
  assert.equal(AV_PRODUCTION_READY, 'NO');
  const health = o.health();
  assert.equal(health.PRODUCTION_READY, 'NO');
  assert.equal(health.kind, AV_KIND);
  assert.equal(health.cloudAgent, false);
  assert.equal(health.usesCloudAgent, false);
  assert.equal(health.autoMerge, false);
  assert.equal(health.ghBranchProtectionMutation, false);
  assert.equal(health.ghRequiredCheckEnforcement, false);
  assert.equal(health.ghBillingChange, false);
  assert.equal(AV_RECEIPT_KIND, 'eos-freeze-drift-receipt');
  assert.equal(AV_RECEIPT_PRODUCTION_READY, 'NO');
  assert.equal(AV_TIP_READER_KIND, 'eos-tip-pin-reader');
  assert.equal(AV_HONESTY_GATE_KIND, 'eos-release-honesty-gate');
});

// ── AV2: freeze==matrix==observed → MATCHED + sealed receipt ────────────────
test('AV2: freeze==matrix==observed → MATCHED + sealed receipt', () => {
  const o = makeObserver();
  const result = o.observe({
    freezeTip: TIP_A,
    matrixTip: TIP_A,
    observedTip: TIP_A,
    mode: 'observe'
  });
  assert.equal(result.ok, true);
  assert.equal(result.code, AV_CODES.MATCHED);
  assert.equal(result.status, 'MATCHED');
  assert.equal(result.drift, false);
  assert.equal(result.deny, false);
  assert.ok(result.receipt);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.code, AV_CODES.MATCHED);
  assert.equal(result.receipt.freezeTip, TIP_A);
  assert.equal(result.receipt.matrixTip, TIP_A);
  assert.equal(result.receipt.observedTip, TIP_A);
  assert.ok(result.receipt.receiptId.startsWith('AV-RCPT-'));
  assert.equal(result.honestyClaimAllowed, true);
});

// ── AV3: freeze≠observed → DRIFT_MEASURED / TIP_MISMATCH ────────────────────
test('AV3: freeze≠observed → DRIFT_MEASURED (TIP_MISMATCH) with sealed evidence', () => {
  const o = makeObserver();
  const result = o.observe({
    freezeTip: TIP_A,
    matrixTip: TIP_A,
    observedTip: TIP_B,
    mode: 'observe'
  });
  assert.equal(result.ok, true); // observe reports, does not deny
  assert.equal(result.drift, true);
  assert.equal(result.status, 'DRIFT_MEASURED');
  assert.ok(
    result.code === AV_CODES.TIP_MISMATCH ||
      result.code === AV_CODES.DRIFT_MEASURED
  );
  assert.ok(result.mismatches.includes('TIP_MISMATCH'));
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.drift, true);
  assert.equal(result.deny, false);
  assert.equal(result.autoMerge, false);
});

// ── AV4: freeze≠matrix → FREEZE_MATRIX_MISMATCH / DRIFT ─────────────────────
test('AV4: freeze≠matrix → FREEZE_MATRIX_MISMATCH / DRIFT_MEASURED', () => {
  const o = makeObserver();
  const result = o.observe({
    freezeTip: TIP_A,
    matrixTip: TIP_B,
    observedTip: TIP_A,
    mode: 'observe'
  });
  assert.equal(result.drift, true);
  assert.ok(result.mismatches.includes('FREEZE_MATRIX_MISMATCH'));
  assert.equal(result.code, AV_CODES.FREEZE_MATRIX_MISMATCH);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.status, 'DRIFT_MEASURED');
});

// ── AV5: fail-closed + drift → DENY / HONESTY_CLAIM_DENIED ──────────────────
test('AV5: fail-closed + drift → DENY / HONESTY_CLAIM_DENIED', () => {
  const o = makeObserver();
  const result = o.observe({
    freezeTip: TIP_A,
    matrixTip: TIP_A,
    observedTip: TIP_C,
    mode: 'fail-closed'
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AV_CODES.HONESTY_CLAIM_DENIED);
  assert.equal(result.deny, true);
  assert.equal(result.honestyClaimAllowed, false);
  assert.equal(result.drift, true);
  assert.equal(result.receipt.sealed, true);
  assert.equal(result.receipt.code, AV_CODES.HONESTY_CLAIM_DENIED);
  assert.equal(result.receipt.status, 'DENY');
});

// ── AV6: observe mode + drift → report only, no throw-as-mutation ───────────
test('AV6: observe mode + drift → report only, no throw-as-mutation', () => {
  const o = makeObserver({ throwOnDeny: true });
  // observe mode must NOT throw even with throwOnDeny (deny=false)
  const result = o.observe({
    freezeTip: TIP_A,
    matrixTip: TIP_A,
    observedTip: TIP_B,
    mode: 'observe'
  });
  assert.equal(result.ok, true);
  assert.equal(result.drift, true);
  assert.equal(result.deny, false);
  assert.equal(result.autoMerge, false);
  assert.equal(result.ghBranchProtectionMutation, false);
  assert.equal(result.ghApiMutation, undefined);
  assert.equal(result.receipt.decision, 'REPORT');
});

// ── AV7: invalid tip format → INVALID_TIP ───────────────────────────────────
test('AV7: invalid tip format → INVALID_TIP', () => {
  const o = makeObserver();
  const result = o.observe({
    freezeTip: 'not-a-sha',
    matrixTip: TIP_A,
    observedTip: TIP_A
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, AV_CODES.INVALID_TIP);
  assert.equal(result.receipt.sealed, true);

  const short = o.observe({
    freezeTip: '1447918',
    matrixTip: TIP_A,
    observedTip: TIP_A
  });
  assert.equal(short.ok, false);
  assert.equal(short.code, AV_CODES.INVALID_TIP);

  const n = normalizeTip('zzz');
  assert.equal(n.ok, false);
  assert.equal(n.code, 'INVALID_TIP');
});

// ── AV8: PRODUCTION_READY === 'NO' ──────────────────────────────────────────
test('AV8: PRODUCTION_READY === NO across surface', () => {
  assert.equal(AV_PRODUCTION_READY, 'NO');
  assert.equal(AV_RECEIPT_PRODUCTION_READY, 'NO');
  const o = makeObserver();
  assert.equal(o.PRODUCTION_READY, 'NO');
  assert.equal(o.health().PRODUCTION_READY, 'NO');
  const rcpt = buildDriftReceipt({ ok: true, code: 'MATCHED' });
  assert.equal(rcpt.PRODUCTION_READY, 'NO');
});

// ── AV9: NON-CLAIM — no auto-merge / no GH branch protection mutation APIs ──
test('AV9: NON-CLAIM — no auto-merge / no GH branch protection mutation APIs in surface', () => {
  const o = makeObserver();
  const caps = o.surfaceCapabilities();
  assert.equal(caps.observe, true);
  assert.equal(caps.autoMerge, false);
  assert.equal(caps.mergePullRequest, false);
  assert.equal(caps.updateBranchProtection, false);
  assert.equal(caps.setRequiredStatusChecks, false);
  assert.equal(caps.upgradeGhBilling, false);
  assert.equal(caps.mutateGhApi, false);
  // Methods must not exist on observer
  assert.equal(typeof o.autoMerge, 'undefined');
  assert.equal(typeof o.mergePullRequest, 'undefined');
  assert.equal(typeof o.updateBranchProtection, 'undefined');
  assert.equal(typeof o.setRequiredStatusChecks, 'undefined');
  assert.equal(typeof o.upgradeGhBilling, 'undefined');

  const state = o.getState();
  assert.equal(state.autoMerge, false);
  assert.equal(state.ghBranchProtectionMutation, false);
  assert.equal(state.ghRequiredCheckEnforcement, false);
  assert.equal(state.ghBillingChange, false);
  assert.equal(state.ghApiMutation, false);

  const rcpt = buildDriftReceipt({ ok: true, code: 'MATCHED' });
  assert.equal(rcpt.autoMerge, false);
  assert.equal(rcpt.autoMergeClaim, false);
  assert.equal(rcpt.ghBranchProtectionMutation, false);
  assert.equal(rcpt.ghRequiredCheckEnforcement, false);
  assert.equal(rcpt.ghBillingChange, false);
  assert.equal(rcpt.ghApiMutation, false);
});

// ── AV10: Fundacion Δ=0 / no Fundacion writes ───────────────────────────────
test('AV10: Fundacion always deny; fundacionDelta 0', () => {
  const o = makeObserver();
  const result = o.writeFundacion({ anything: true });
  assert.equal(result.ok, false);
  assert.equal(result.code, AV_CODES.FUNDACION_DENIED);
  assert.equal(result.fundacionDelta, 0);
  assert.equal(result.receipt.fundacionDelta, 0);
  assert.equal(o.getState().fundacionDelta, 0);
  assert.equal(o.health().fundacionDelta, 0);
});

// ── AV11: parse main_tip / evaluated_tip from sample fences ─────────────────
test('AV11: parse main_tip / evaluated_tip from sample fences', () => {
  const main = parseMainTip(FREEZE_FENCE_A);
  assert.equal(main.ok, true);
  assert.equal(main.tip, TIP_A);

  const evalTip = parseEvaluatedTip(MATRIX_FENCE_A);
  assert.equal(evalTip.ok, true);
  assert.equal(evalTip.tip, TIP_A);

  const evalB = parseEvaluatedTip(MATRIX_FENCE_B);
  assert.equal(evalB.ok, true);
  assert.equal(evalB.tip, TIP_B);

  const reader = createTipPinReader();
  assert.equal(reader.parseMainTip(FREEZE_FENCE_A).tip, TIP_A);
  assert.equal(reader.parseEvaluatedTip(MATRIX_FENCE_A).tip, TIP_A);

  // End-to-end observe from fence text
  const o = makeObserver();
  const matched = o.observe({
    freezeTip: FREEZE_FENCE_A,
    matrixTip: MATRIX_FENCE_A,
    observedTip: TIP_A
  });
  assert.equal(matched.code, AV_CODES.MATCHED);

  const drifted = o.observe({
    freezeTip: FREEZE_FENCE_A,
    matrixTip: MATRIX_FENCE_B,
    observedTip: TIP_A
  });
  assert.equal(drifted.drift, true);
  assert.ok(drifted.mismatches.includes('FREEZE_MATRIX_MISMATCH'));
});

// ── AV12: fail-closed throwOnDeny raises FreezeDriftObserverError ───────────
test('AV12: fail-closed + throwOnDeny raises FreezeDriftObserverError', () => {
  const o = makeObserver({ throwOnDeny: true });
  assert.throws(
    () =>
      o.observe({
        freezeTip: TIP_A,
        matrixTip: TIP_A,
        observedTip: TIP_B,
        mode: 'fail-closed'
      }),
    (err) =>
      err instanceof FreezeDriftObserverError &&
      err.code === AV_CODES.HONESTY_CLAIM_DENIED
  );
});

// ── AV13: MISSING_DEP when freeze or observed absent ────────────────────────
test('AV13: MISSING_DEP when freezeTip or observedTip absent', () => {
  const o = makeObserver();
  const r1 = o.observe({ observedTip: TIP_A });
  assert.equal(r1.ok, false);
  assert.equal(r1.code, AV_CODES.MISSING_DEP);
  const r2 = o.observe({ freezeTip: TIP_A });
  assert.equal(r2.ok, false);
  assert.equal(r2.code, AV_CODES.MISSING_DEP);
});

// ── AV14: INVALID_REQUEST on null observe ───────────────────────────────────
test('AV14: INVALID_REQUEST on null observe request', () => {
  const o = makeObserver();
  const r = o.observe(null);
  assert.equal(r.ok, false);
  assert.equal(r.code, AV_CODES.INVALID_REQUEST);
});

// ── AV15: honesty-gate evaluate helpers ─────────────────────────────────────
test('AV15: honesty-gate evaluate MATCHED / observe-drift / fail-closed', () => {
  const g = createHonestyGate();
  assert.equal(g.PRODUCTION_READY, 'NO');
  assert.equal(g.autoMerge, false);
  assert.equal(g.mutateGhBranchProtection, false);
  assert.equal(g.claimGhBillingUpgrade, false);

  const matched = evaluateHonestyGate({
    drift: false,
    matched: true,
    mode: 'observe'
  });
  assert.equal(matched.code, 'MATCHED');
  assert.equal(matched.honestyClaimAllowed, true);

  const obs = evaluateHonestyGate({
    drift: true,
    mode: 'observe'
  });
  assert.equal(obs.code, 'DRIFT_MEASURED');
  assert.equal(obs.deny, false);

  const fc = evaluateHonestyGate({
    drift: true,
    mode: 'fail-closed'
  });
  assert.equal(fc.code, 'HONESTY_CLAIM_DENIED');
  assert.equal(fc.deny, true);
  assert.equal(fc.honestyClaimAllowed, false);
});

// ── AV16: AV_CODES freeze includes required codes ───────────────────────────
test('AV16: AV_CODES freeze includes required codes', () => {
  for (const k of [
    'OK',
    'MATCHED',
    'DRIFT_MEASURED',
    'DENY',
    'TIP_MISMATCH',
    'FREEZE_MATRIX_MISMATCH',
    'INVALID_TIP',
    'INVALID_REQUEST',
    'MISSING_DEP',
    'HONESTY_CLAIM_DENIED'
  ]) {
    assert.equal(AV_CODES[k], k);
  }
  assert.ok(Object.isFrozen(AV_CODES));
});

// ── AV17: stableStringify + defaultHash hermetic; receipt NON-CLAIM ─────────
test('AV17: stableStringify / defaultHash hermetic; receipt NON-CLAIM flags', () => {
  const a = stableStringify({ b: 1, a: 2 });
  const c = stableStringify({ a: 2, b: 1 });
  assert.equal(a, c);
  const h1 = defaultHash({ x: 1 });
  const h2 = defaultHash({ x: 1 });
  assert.equal(h1, h2);
  assert.equal(h1.length, 64);

  const rcpt = buildDriftReceipt({
    ok: false,
    code: 'DRIFT_MEASURED',
    status: 'DRIFT_MEASURED',
    freezeTip: TIP_A,
    observedTip: TIP_B,
    drift: true,
    mode: 'observe'
  });
  assert.equal(rcpt.sealed, true);
  assert.equal(rcpt.fundacionDelta, 0);
  assert.equal(rcpt.cloudAgent, false);
  assert.equal(rcpt.autoMerge, false);
  assert.equal(rcpt.ghBranchProtectionMutation, false);
});

// ── AV18: freeze==observed, matrix omitted → MATCHED ────────────────────────
test('AV18: freeze==observed with matrix omitted → MATCHED', () => {
  const o = makeObserver();
  const result = o.observe({
    freezeTip: TIP_A,
    observedTip: TIP_A
  });
  assert.equal(result.code, AV_CODES.MATCHED);
  assert.equal(result.matrixTip, null);
  assert.equal(result.drift, false);
});

// ── AV19: source modules have no GH mutation / auto-merge claim strings as APIs
test('AV19: source modules under freeze-drift do not export GH enforcement mutation APIs', () => {
  const files = fs.readdirSync(MODULE_DIR).filter((f) => f.endsWith('.js'));
  assert.ok(files.length >= 4, 'expected ≥4 freeze-drift modules');
  const forbiddenFns = [
    'export function autoMerge',
    'export function mergePullRequest',
    'export function updateBranchProtection',
    'export function setRequiredStatusChecks',
    'export function upgradeGhBilling',
    'octokit.rest.repos.updateBranchProtection',
    'gh api repos/.*/branches/.*/protection'
  ];
  for (const f of files) {
    const src = fs.readFileSync(path.join(MODULE_DIR, f), 'utf8');
    for (const needle of forbiddenFns) {
      assert.equal(
        src.includes(needle),
        false,
        `${f} must not contain ${needle}`
      );
    }
  }
});

// ── AV20: getState counters increment on observe paths ──────────────────────
test('AV20: getState counters track observe / match / drift / deny', () => {
  const o = makeObserver();
  o.observe({ freezeTip: TIP_A, matrixTip: TIP_A, observedTip: TIP_A });
  o.observe({
    freezeTip: TIP_A,
    matrixTip: TIP_A,
    observedTip: TIP_B,
    mode: 'observe'
  });
  o.observe({
    freezeTip: TIP_A,
    matrixTip: TIP_A,
    observedTip: TIP_B,
    mode: 'fail-closed'
  });
  const s = o.getState();
  assert.equal(s.observeCount, 3);
  assert.equal(s.matchCount, 1);
  assert.equal(s.driftCount, 2);
  assert.ok(s.denyCount >= 1);
  assert.equal(s.PRODUCTION_READY, 'NO');
  assert.equal(s.fundacionDelta, 0);
});
