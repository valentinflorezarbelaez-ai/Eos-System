/**
 * @module backpressure-load-shed-receipt
 * SPEC-0147 / Mission EK — Backpressure & Load-Shed Governance Port Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     loadDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   load,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34ReopenRefused, l35ReopenRefused, l36AutoCloseRefused,
 *                   liveTimerRefused, networkSheddingRefused, schemaJsonAddRefused,
 *                   readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   loadShedHold { hermeticInMemoryOnly: true, failClosed: true,
 *                  liveTimerRefused: true, networkSheddingRefused: true,
 *                  wallClockAuthorityRefused: true, tipRewriteRefused: true,
 *                  schemaJsonAddRefused: true, governedSealOnly: true,
 *                  distinctFromEjAdmissionQuota: true,
 *                  distinctFromDxCircuitBreaker: true }
 *
 * Freeze soft-observe pin is `5e5af281` (EJ #491 merge / tip-refresh #492 pin).
 * Soft-observe pinShort only — do NOT rewrite freeze tip pins from this mission package.
 *
 * Distinct from EJ admission/intake quotas (maxConcurrent/maxQueueDepth admit/DENY) —
 * this is downstream load-shed / backpressure when admitted work still overwhelms capacity.
 * Distinct from DX circuit breaker (failureThreshold/cooldown trip).
 *
 * PRODUCTION_READY: NO
 * PASS = sealed backpressure/load-shed receipt ≠ tip-refresh ≠ PRODUCTION_READY
 * ≠ live timers ≠ real network shedding ≠ wall-clock authority ≠ EJ quota ≠ DX trip
 * SHED = fail-closed load-shed when hermetic observed pressure exceeds threshold
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EK_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EK_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EK_RECEIPT_KIND = 'eos-backpressure-load-shed-receipt';
export const EK_DECISIONS = Object.freeze(['PASS', 'SHED', 'DENY', 'HOLD']);
export const EK_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);
export const EK_OPERATION = 'BACKPRESSURE_LOAD_SHED_GOVERNANCE';

export const EK_FREEZE_PIN = '5e5af28130d3e742ae5274fab9913453317c913b';
export const EK_FREEZE_PIN_SHORT = '5e5af281';

export const EK_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Backpressure & Load-Shed Governance ≠ PRODUCTION_READY flip ≠ tip-refresh ≠ live timers',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 reopen refused',
  'NON-CLAIM: L36 auto-close refused (EL–EN pending)',
  'NON-CLAIM: Live timers / real network shedding / wall-clock authority refused',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: Distinct from EJ admission quotas (maxConcurrent/maxQueueDepth) — load-shed only',
  'NON-CLAIM: Distinct from DX circuit breaker (failureThreshold/cooldown) — load-shed only',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: PASS/SHED = sealed backpressure/load-shed ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EK_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EK_LOAD_SHED_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  failClosed: true,
  liveTimerRefused: true,
  networkSheddingRefused: true,
  wallClockAuthorityRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  governedSealOnly: true,
  distinctFromEjAdmissionQuota: true,
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
    pin: EK_FREEZE_PIN,
    pinShort: EK_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34ReopenRefused: true,
    l35ReopenRefused: true,
    l36AutoCloseRefused: true,
    liveTimerRefused: true,
    networkSheddingRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EK_FREEZE_NONCLAIM_LABELS,
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

export function forceLoadShedHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    failClosed: true,
    liveTimerRefused: true,
    networkSheddingRefused: true,
    wallClockAuthorityRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    governedSealOnly: true,
    distinctFromEjAdmissionQuota: true,
    distinctFromDxCircuitBreaker: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalBackpressureLoadShedSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    loadDigest: receipt.loadDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Backpressure & Load-Shed Governance Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildBackpressureLoadShedReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EK-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-ek-default');
  const changeId = String(input.changeId || 'eos-ladder-36-mission-ek');
  const decision = EK_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EK_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const load = input.load || null;
  const loadDigest =
    input.loadDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, load }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: EK_OPERATION,
    planId,
    decision,
    changeId,
    loadDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EK_RECEIPT_KIND,
    receiptId,
    operation: EK_OPERATION,
    planId,
    decision,
    changeId,
    ritualMode,
    loadDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    load,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    loadShedHold: forceLoadShedHold(input.loadShedHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyBackpressureLoadShedReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EK_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EK_RECEIPT_KIND}` };
  }
  if (receipt.operation !== EK_OPERATION) {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalBackpressureLoadShedSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
