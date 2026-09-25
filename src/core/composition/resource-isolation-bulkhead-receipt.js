/**
 * @module resource-isolation-bulkhead-receipt
 * SPEC-0148 / Mission EL — Resource Isolation / Bulkhead Boundary Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     bulkheadDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   bulkhead,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34ReopenRefused, l35ReopenRefused, l36AutoCloseRefused,
 *                   liveThreadRefused, realProcessIsolationRefused, schemaJsonAddRefused,
 *                   readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   bulkheadHold { hermeticInMemoryOnly: true, failClosed: true,
 *                  liveThreadRefused: true, realProcessIsolationRefused: true,
 *                  wallClockAuthorityRefused: true, tipRewriteRefused: true,
 *                  schemaJsonAddRefused: true, governedSealOnly: true,
 *                  distinctFromEjAdmissionQuota: true,
 *                  distinctFromEkLoadShed: true,
 *                  distinctFromDxCircuitBreaker: true }
 *
 * Freeze soft-observe pin is `72697dd5` (EK #493 merge / tip-refresh #494 pin).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from EJ admission/intake quotas (maxConcurrent/maxQueueDepth admit/DENY) —
 * Distinct from EK backpressure/load-shed (pressureThreshold/observedPressure PASS/SHED) —
 * this is bulkhead / isolation boundary so failure or overload in one pool cannot cascade.
 * Distinct from DX circuit breaker (failureThreshold/cooldown trip).
 *
 * PRODUCTION_READY: NO
 * PASS = sealed bulkhead/isolation receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live threads ≠ real process isolation ≠ wall-clock authority ≠ EJ quota ≠ EK shed ≠ DX trip
 * ISOLATE = fail-closed isolation when hermetic observed cross-bulkhead breach / occupancy exceed
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EL_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EL_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EL_RECEIPT_KIND = 'eos-resource-isolation-bulkhead-receipt';
export const EL_DECISIONS = Object.freeze(['PASS', 'ISOLATE', 'DENY', 'HOLD']);
export const EL_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EL_OPERATION = 'RESOURCE_ISOLATION_BULKHEAD_BOUNDARY';

export const EL_FREEZE_PIN = '72697dd506284284e5cbbe3ebf2c68cef8fbf006';
export const EL_FREEZE_PIN_SHORT = '72697dd5';

export const EL_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Resource Isolation / Bulkhead Boundary ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live threads',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 reopen refused',
  'NON-CLAIM: L36 auto-close refused (EM–EN pending)',
  'NON-CLAIM: Live threads / real process isolation / wall-clock authority refused',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from EJ admission quotas (maxConcurrent/maxQueueDepth) — bulkhead only',
  'NON-CLAIM: Distinct from EK load-shed (pressureThreshold/observedPressure) — bulkhead only',
  'NON-CLAIM: Distinct from DX circuit breaker (failureThreshold/cooldown) — bulkhead only',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS/ISOLATE = sealed bulkhead/isolation ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EL_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EL_BULKHEAD_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveThreadRefused: true,
  realProcessIsolationRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  distinctFromEjAdmissionQuota: true,
  distinctFromEkLoadShed: true,
  distinctFromDxCircuitBreaker: true
});

let _receiptSeq = 0;

export function _resetReceiptSeqForTests() {
  _receiptSeq = 0;
}

export function sha256Canonical(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(str).digest('hex');
}

export function forceFreezeObserve(opts = {}) {
  return Object.freeze({
    pin: EL_FREEZE_PIN,
    pinShort: EL_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34ReopenRefused: true,
    l35ReopenRefused: true,
    l36AutoCloseRefused: true,
    liveThreadRefused: true,
    realProcessIsolationRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EL_FREEZE_NONCLAIM_LABELS,
    ...opts
  });
}

export function forceCeilingHold(opts = {}) {
  return Object.freeze({
    schemasAtCeiling: true,
    slimHold: true,
    ...opts
  });
}

export function forceBulkheadHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveThreadRefused: true,
    realProcessIsolationRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    distinctFromEjAdmissionQuota: true,
    distinctFromEkLoadShed: true,
    distinctFromDxCircuitBreaker: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalResourceIsolationBulkheadSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    bulkheadDigest: receipt.bulkheadDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Resource Isolation / Bulkhead Boundary Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildResourceIsolationBulkheadReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EL-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-el-default');
  const changeId = String(input.changeId || 'eos-ladder-36-mission-el');
  const decision = EL_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EL_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const bulkhead = input.bulkhead || null;
  const bulkheadDigest =
    input.bulkheadDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, bulkhead }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: EL_OPERATION,
    planId,
    decision,
    changeId,
    bulkheadDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EL_RECEIPT_KIND,
    receiptId,
    operation: EL_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    bulkheadDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    bulkhead,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    bulkheadHold: forceBulkheadHold(input.bulkheadHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyResourceIsolationBulkheadReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EL_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EL_RECEIPT_KIND}` };
  }
  if (receipt.operation !== EL_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalResourceIsolationBulkheadSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
