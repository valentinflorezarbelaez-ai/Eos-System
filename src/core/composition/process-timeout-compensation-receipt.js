/**
 * @module process-timeout-compensation-receipt
 * SPEC-0143 / Mission EG — Long-Running Process Timeout Compensation Receipt.
 * Pure Layer-0 sha256 via node:crypto. Never seal secrets.
 *
 * Canonical seal fields (nine):
 *   { receiptId, operation, planId, decision, changeId,
 *     compensationDigest, timestamp, fundacionDelta, prevReceiptHash }
 *
 * Attached (frozen):
 *   ritualMode (ACTIVE|HOLD|DRY_RUN),
 *   compensation,
 *   freezeObserve { pin, pinShort, tipRewriteRefused, productionReadyFlipRefused,
 *                   l30ReopenRefused, l31ReopenRefused, l32ReopenRefused, l33ReopenRefused,
 *                   l34ReopenRefused, l35AutoCloseRefused, unsupervisedCompensateRefused,
 *                   schemaJsonAddRefused, readOnly: true, nonClaimLabels[] },
 *   ceilingHold { schemasAtCeiling: true, slimHold: true },
 *   compensationHold { hermeticInMemoryOnly: true, unsupervisedCompensateRefused: true,
 *                      liveSagaRewriteRefused: true, networkWriteRefused: true,
 *                      tipRewriteRefused: true, schemaJsonAddRefused: true,
 *                      compensateFailClosed: true, governedSealOnly: true }
 *
 * Freeze soft-observe pin is `73252208` (EF merge / tip-refresh #479).
 * Do NOT rewrite freeze tip pins from this mission package.
 *
 * PRODUCTION_READY: NO
 * COMPENSATE = fail-closed hermetic in-memory only ≠ live saga rewrite ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY
 * PASS = hermetic timeout-compensation receipt ≠ unsupervised compensate ≠ tip-refresh ≠ PRODUCTION_READY
 */

import { createHash } from 'node:crypto';

/** @type {'NO'} */
export const EG_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const EG_RECEIPT_PRODUCTION_READY = 'NO';
/** @type {'NO'} */
export const PRODUCTION_READY = 'NO';

export const EG_RECEIPT_KIND = 'eos-process-timeout-compensation-receipt';
export const EG_DECISIONS = Object.freeze(['PASS', 'DENY', 'HOLD', 'COMPENSATE']);
export const EG_RITUAL_MODES = Object.freeze(['ACTIVE', 'HOLD', 'DRY_RUN']);

export const EG_FREEZE_PIN = '732522086a161f257bb758a31350c84c33030bf9';
export const EG_FREEZE_PIN_SHORT = '73252208';

export const EG_FREEZE_NONCLAIM_LABELS = Object.freeze([
  'NON-CLAIM: Process Timeout Compensation ≠ PRODUCTION_READY flip ≠ live saga rewrite ≠ tip-refresh',
  'NON-CLAIM: PRODUCTION_READY flip refused',
  'NON-CLAIM: Tip-pin rewrite refused',
  'NON-CLAIM: L30 reopen refused',
  'NON-CLAIM: L31 reopen refused',
  'NON-CLAIM: L32 reopen refused',
  'NON-CLAIM: L33 reopen refused',
  'NON-CLAIM: L34 reopen refused',
  'NON-CLAIM: L35 auto-close refused',
  'NON-CLAIM: Unsupervised compensate / live saga rewrite / network write refused',
  'NON-CLAIM: Schema JSON add refused (AT_CEILING 35/35)',
  'NON-CLAIM: GHE / GHA green claims refused',
  'NON-CLAIM: CloudAgent out of path',
  'NON-CLAIM: Mass prune refused',
  'NON-CLAIM: COMPENSATE = fail-closed hermetic in-memory only ≠ live saga rewrite ≠ tip-refresh ≠ PRODUCTION_READY',
  'NON-CLAIM: PASS = hermetic timeout-compensation receipt ≠ unsupervised compensate ≠ tip-refresh ≠ PRODUCTION_READY'
]);

export const EG_CEILING_HOLD_TEMPLATE = Object.freeze({
  schemasAtCeiling: true,
  slimHold: true
});

export const EG_COMPENSATION_HOLD_TEMPLATE = Object.freeze({
  hermeticInMemoryOnly: true,
  unsupervisedCompensateRefused: true,
  liveSagaRewriteRefused: true,
  networkWriteRefused: true,
  tipRewriteRefused: true,
  schemaJsonAddRefused: true,
  compensateFailClosed: true,
  governedSealOnly: true
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
    pin: EG_FREEZE_PIN,
    pinShort: EG_FREEZE_PIN_SHORT,
    tipRewriteRefused: true,
    productionReadyFlipRefused: true,
    l30ReopenRefused: true,
    l31ReopenRefused: true,
    l32ReopenRefused: true,
    l33ReopenRefused: true,
    l34ReopenRefused: true,
    l35AutoCloseRefused: true,
    unsupervisedCompensateRefused: true,
    schemaJsonAddRefused: true,
    readOnly: true,
    nonClaimLabels: EG_FREEZE_NONCLAIM_LABELS,
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

export function forceCompensationHold(opts = {}) {
  return Object.freeze({
    hermeticInMemoryOnly: true,
    unsupervisedCompensateRefused: true,
    liveSagaRewriteRefused: true,
    networkWriteRefused: true,
    tipRewriteRefused: true,
    schemaJsonAddRefused: true,
    compensateFailClosed: true,
    governedSealOnly: true,
    ...opts
  });
}

/**
 * Builds the canonical 9-field body for SHA-256 seal
 */
export function canonicalProcessTimeoutCompensationSealBody(receipt) {
  return {
    receiptId: receipt.receiptId,
    operation: receipt.operation,
    planId: receipt.planId,
    decision: receipt.decision,
    changeId: receipt.changeId,
    compensationDigest: receipt.compensationDigest,
    timestamp: receipt.timestamp,
    fundacionDelta: receipt.fundacionDelta,
    prevReceiptHash: receipt.prevReceiptHash
  };
}

/**
 * Builds a sealed Process Timeout Compensation Receipt
 * @param {object} input
 * @returns {object}
 */
export function buildProcessTimeoutCompensationReceipt(input = {}) {
  _receiptSeq += 1;
  const seqStr = String(_receiptSeq).padStart(4, '0');
  const receiptId = input.receiptId || `EG-RCPT-${seqStr}`;

  const planId = String(input.planId || 'plan-eg-default');
  const changeId = String(input.changeId || 'eos-ladder-35-mission-eg');
  const decision = EG_DECISIONS.includes(input.decision) ? input.decision : 'DENY';
  const ritualMode = EG_RITUAL_MODES.includes(input.ritualMode) ? input.ritualMode : 'ACTIVE';
  const compensation = input.compensation || null;
  const compensationDigest =
    input.compensationDigest ||
    sha256Canonical(JSON.stringify({ planId, changeId, decision, compensation }));
  const timestamp = input.timestamp || new Date().toISOString();
  const prevReceiptHash = input.prevReceiptHash || '0'.repeat(64);

  const rawSeal = {
    receiptId,
    operation: 'PROCESS_TIMEOUT_COMPENSATION',
    planId,
    decision,
    changeId,
    compensationDigest,
    timestamp,
    fundacionDelta: 0,
    prevReceiptHash
  };

  const receiptHash = sha256Canonical(rawSeal);

  return {
    kind: EG_RECEIPT_KIND,
    receiptId,
    operation: 'PROCESS_TIMEOUT_COMPENSATION',
    planId,
    decision,
    changeId,
    ritualMode,
    compensationDigest,
    timestamp,
    fundacionDelta: 0,
    productionReady: 'NO',
    compensation,
    freezeObserve: forceFreezeObserve(),
    ceilingHold: forceCeilingHold(),
    compensationHold: forceCompensationHold(input.compensationHold || {}),
    receiptHash,
    prevReceiptHash
  };
}

/**
 * Verifies receipt hash and canonical invariants
 * @param {object} receipt
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyProcessTimeoutCompensationReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') {
    return { ok: false, reason: 'Invalid receipt object' };
  }

  if (receipt.kind !== EG_RECEIPT_KIND) {
    return { ok: false, reason: `kind mismatch: expected ${EG_RECEIPT_KIND}` };
  }
  if (receipt.operation !== 'PROCESS_TIMEOUT_COMPENSATION') {
    return { ok: false, reason: 'operation mismatch' };
  }
  if (receipt.fundacionDelta !== 0) {
    return { ok: false, reason: 'fundacionDelta must be 0' };
  }
  if (receipt.productionReady !== 'NO') {
    return { ok: false, reason: 'productionReady must be NO' };
  }

  const rawSeal = canonicalProcessTimeoutCompensationSealBody(receipt);
  const expectedHash = sha256Canonical(rawSeal);

  if (receipt.receiptHash !== expectedHash) {
    return {
      ok: false,
      reason: `receiptHash mismatch: expected ${expectedHash}, got ${receipt.receiptHash}`
    };
  }

  return { ok: true };
}
